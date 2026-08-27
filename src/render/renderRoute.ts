/**
 * POST /render — finish a talking-head video with ffmpeg.
 *
 * WHY THIS IS NOT AN AGENT CALL: trimming, padding, burning captions and
 * normalising loudness have exactly one correct answer. Putting an LLM in front
 * of that buys latency, token cost per render, and the chance it improvises on
 * video #47. This is a deterministic route that n8n calls over HTTP and gets the
 * finished file back in the response — which also means there is nothing to
 * retrieve from a workspace afterwards.
 *
 * Request body:
 * {
 *   "video_url":  "https://…/clip.mp4",        // required
 *   "lead_in":    0.6,                          // seconds held before speech starts
 *   "captions":   [{ "start": 1.2, "end": 2.4, "text": "…" }],
 *   "url_card":   { "text": "www.example.com", "start": 14.6, "end": 19.4 },
 *   "loudnorm":   true,
 *   "font":       "DejaVu Sans"
 * }
 *
 * Timestamps are in FINAL timeline coordinates — i.e. they already include the
 * lead-in. The caller computes the timeline anyway when it assembles the
 * voiceover, so asking it to subtract the pad again would only invite drift.
 *
 * NEGATIVE timestamps count back from the end of the finished video, so a
 * closing CTA card can be placed as `start: -4.8, end: -0.2` by a caller that
 * knows what the last line says but not yet how long the video runs.
 *
 * Responds with the video/mp4 bytes.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { buildAss, findOverlap, type Caption, type UrlCard } from './subtitles.js';

const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024; // 200 MB
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

// Negative timestamps mean "seconds before the end of the finished video" —
// see resolveTime(). So no .min(0) here.
const captionSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string().min(1),
});

const bodySchema = z.object({
  video_url: z.string().url(),
  lead_in: z.number().min(0).max(5).default(0.6),
  captions: z.array(captionSchema).max(500).default([]),
  url_card: z
    .object({
      text: z.string().min(1).max(120),
      start: z.number(),
      end: z.number(),
    })
    .nullish(),
  loudnorm: z.boolean().default(true),
  font: z.string().max(64).optional(),
});

/**
 * Refuse URLs that point back at our own network.
 *
 * The route is authenticated, so this is defence in depth rather than the only
 * thing standing between a stranger and the metadata service. It blocks literal
 * private hosts; it does NOT resolve DNS, so a hostname that resolves to a
 * private address still gets through. Fixing that properly means resolving and
 * checking every A record before connecting, which is worth doing if this route
 * ever becomes reachable by anyone but n8n.
 */
function isBlockedHost(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'video_url is not a valid URL';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'video_url must be http or https';
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blocked =
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  return blocked ? `video_url points at a private host (${host})` : null;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Could not fetch video_url: HTTP ${res.status}`);
  }
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) {
    throw new Error(`video_url is ${declared} bytes, over the ${MAX_DOWNLOAD_BYTES} limit`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD_BYTES) {
    throw new Error(`video_url is ${buf.length} bytes, over the ${MAX_DOWNLOAD_BYTES} limit`);
  }
  await writeFile(dest, buf);
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stderr.on('data', (d) => {
      stderr += String(d);
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} failed to start: ${err.message}. Is it installed in the image?`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stderr);
      else reject(new Error(`${cmd} exited ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}

async function probeSize(path: string): Promise<{ width: number; height: number; duration: number }> {
  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      path,
    ]);
    let stdout = '';
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.on('error', (err) => reject(new Error(`ffprobe failed to start: ${err.message}`)));
    child.on('close', (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`ffprobe exited ${code}`)),
    );
  });
  // ffprobe prints the stream line then the format line: "720,1280" then "7.2"
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dims = (lines[0] ?? '').split(',');
  const w = parseInt(dims[0] ?? '', 10);
  const h = parseInt(dims[1] ?? '', 10);
  const duration = parseFloat(lines[1] ?? '0');
  if (!w || !h) throw new Error(`Could not read video dimensions (ffprobe said "${out}")`);
  return { width: w, height: h, duration: Number.isFinite(duration) ? duration : 0 };
}

/**
 * Resolve a timestamp that may be counted from the end of the finished video.
 *
 * A caller assembling the request usually knows what the closing line SAYS but
 * not when it lands — the video does not exist yet. Negative values mean
 * "seconds before the end", so a CTA card can be placed with `start: -4.8,
 * end: -0.2` without anyone having to predict the duration.
 *
 * Zero and positive values are absolute, measured in the final timeline (i.e.
 * after the lead-in pad), which is what the caption path already assumes.
 */
function resolveTime(t: number, finalDuration: number): number {
  if (t >= 0) return t;
  return Math.max(0, finalDuration + t);
}

export async function renderHandler(req: Request, res: Response): Promise<void> {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', detail: parsed.error.issues });
    return;
  }
  const body = parsed.data;

  const blocked = isBlockedHost(body.video_url);
  if (blocked) {
    res.status(400).json({ error: 'Rejected video_url', detail: blocked });
    return;
  }

  const work = await mkdtemp(join(tmpdir(), 'render-'));
  const input = join(work, 'in.mp4');
  const subs = join(work, 'subs.ass');
  const output = join(work, 'out.mp4');

  try {
    await download(body.video_url, input);
    const probed = await probeSize(input);
    const width = probed.width;
    const height = probed.height;

    // Everything downstream is expressed in the FINAL timeline, which includes
    // the lead-in we are about to add.
    const finalDuration = probed.duration + body.lead_in;
    const captions: Caption[] = body.captions.map((c) => ({
      start: resolveTime(c.start, finalDuration),
      end: resolveTime(c.end, finalDuration),
      text: c.text,
    }));
    const urlCard: UrlCard | null = body.url_card
      ? {
          text: body.url_card.text,
          start: resolveTime(body.url_card.start, finalDuration),
          end: resolveTime(body.url_card.end, finalDuration),
        }
      : null;

    const overlap = findOverlap(captions, urlCard);
    if (overlap) {
      res.status(400).json({ error: 'Captions overlap the URL card', detail: overlap });
      return;
    }

    const filters: string[] = [];
    if (body.lead_in > 0) {
      // Clone the first frame rather than inserting black: the output otherwise
      // opens mid-word, which reads as a broken file.
      filters.push(`tpad=start_duration=${body.lead_in}:start_mode=clone`);
    }

    const hasSubs = captions.length > 0 || urlCard !== null;
    if (hasSubs) {
      await writeFile(
        subs,
        buildAss(captions, urlCard, { width, height, fontName: body.font }),
        'utf8',
      );
      // ffmpeg's filter parser treats ':' and '\' as syntax, so the path is
      // passed as a bare filename with cwd set to the work dir instead.
      filters.push('subtitles=subs.ass');
    }

    const audioFilters: string[] = [];
    if (body.lead_in > 0) {
      audioFilters.push(`adelay=${Math.round(body.lead_in * 1000)}:all=1`);
    }
    if (body.loudnorm) {
      audioFilters.push('loudnorm=I=-14:TP=-1.5:LRA=11');
    }

    const args = ['-y', '-v', 'error', '-i', 'in.mp4'];
    if (filters.length) args.push('-vf', filters.join(','));
    if (audioFilters.length) args.push('-af', audioFilters.join(','));
    args.push(
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      'out.mp4',
    );

    await new Promise<void>((resolve, reject) => {
      const child = spawn('ffmpeg', args, { cwd: work });
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
      }, FFMPEG_TIMEOUT_MS);
      child.stderr.on('data', (d) => {
        stderr += String(d);
        if (stderr.length > 20000) stderr = stderr.slice(-20000);
      });
      child.on('error', (err) =>
        reject(new Error(`ffmpeg failed to start: ${err.message}. Is it installed in the image?`)),
      );
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}:\n${stderr.slice(-2000)}`));
      });
    });

    const finished = await readFile(output);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(finished.length));
    res.setHeader('Content-Disposition', 'attachment; filename="render.mp4"');
    res.status(200).send(finished);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[render] failed:', message);
    res.status(500).json({ error: 'Render failed', detail: message });
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

/** Reports whether ffmpeg is actually present, for /health to surface. */
export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await run('ffmpeg', ['-version'], 10000);
    return true;
  } catch {
    return false;
  }
}

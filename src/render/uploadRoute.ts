/**
 * File hosting for generation APIs that only accept URLs.
 *
 * Kie's avatar model takes an `audio_url`, not an audio upload — so a voiceover
 * produced in n8n (binary) has to be reachable over HTTP before Kie can use it.
 * Rather than add a third-party storage vendor for one file, we host it here:
 * the box is already in the pipeline and already authenticated.
 *
 *   POST /upload?ext=mp3     authenticated, raw binary body -> { url }
 *   GET  /files/<name>       PUBLIC, no auth — this is the point
 *
 * ## Why GET is public, and what keeps it safe
 *
 * Kie fetches the URL from its own servers with no credential of ours, so the
 * download cannot require a key. Three things stand in for auth:
 *
 * 1. **Unguessable names.** 32 hex chars of crypto randomness. Enumeration is
 *    not feasible, and nothing is listable — there is no index route.
 * 2. **Strict name validation.** Only `[0-9a-f]{32}.<ext>` is servable, so a
 *    path like `../../etc/passwd` cannot match. This is a whitelist, not an
 *    attempt to strip bad characters — blacklists lose this fight.
 * 3. **Short life.** Files older than TTL_HOURS are swept on each upload, so a
 *    leaked URL stops working rather than lasting forever.
 *
 * Treat anything here as world-readable to whoever holds the URL. It is for
 * pipeline intermediates — voiceovers, stills — never for anything private.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { Request, Response } from 'express';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/workspace/uploads';
const TTL_HOURS = Number(process.env.UPLOAD_TTL_HOURS ?? 24);

/** Extensions we will store and serve, mapped to the type we serve them as. */
const ALLOWED: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  png: 'image/png',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
};

/** Only a name this route generated can ever be served. */
const SERVABLE = /^[0-9a-f]{32}\.([a-z0-9]{1,4})$/;

/**
 * Delete files past their TTL. Runs on upload rather than on a timer so there
 * is no background work to supervise, and a box that is idle does nothing.
 * Failures are swallowed: a full disk is a problem, but not one worth failing
 * an otherwise-good upload over.
 */
async function sweepExpired(): Promise<void> {
  const cutoff = Date.now() - TTL_HOURS * 3600 * 1000;
  const names = await readdir(UPLOAD_DIR).catch(() => [] as string[]);
  const checks = names.map(async (name) => {
    const path = join(UPLOAD_DIR, name);
    const info = await stat(path).catch(() => null);
    if (info && info.mtimeMs < cutoff) {
      await rm(path, { force: true }).catch(() => {});
    }
  });
  await Promise.allSettled(checks);
}

/**
 * The URL we hand back must be fetchable from the public internet — Kie calls
 * it from its own servers. PUBLIC_BASE_URL is the reliable answer; the Host
 * header is a fallback that works when the caller reached us the same way an
 * outside service would.
 */
function publicBase(req: Request): string {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

export async function uploadHandler(req: Request, res: Response): Promise<void> {
  const rawExt = String(req.query.ext ?? 'bin').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(ALLOWED, rawExt)) {
    res.status(400).json({
      error: 'Unsupported ext',
      detail: `ext must be one of: ${Object.keys(ALLOWED).join(', ')}`,
    });
    return;
  }

  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({
      error: 'Empty body',
      detail: 'POST the file as a raw binary body, not multipart or JSON.',
    });
    return;
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await sweepExpired();

    const name = `${randomBytes(16).toString('hex')}.${rawExt}`;
    await writeFile(join(UPLOAD_DIR, name), body);

    res.status(200).json({
      url: `${publicBase(req)}/files/${name}`,
      name,
      bytes: body.length,
      expires_in_hours: TTL_HOURS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[upload] failed:', message);
    res.status(500).json({ error: 'Upload failed', detail: message });
  }
}

export function serveFileHandler(req: Request, res: Response): void {
  const name = String(req.params.name ?? '');
  const match = SERVABLE.exec(name);

  if (!match) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const ext = match[1];
  const contentType = ALLOWED[ext];
  if (!contentType) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Safe to join: the regex above guarantees `name` has no separators or dots
  // beyond the single extension, so it cannot escape UPLOAD_DIR.
  const path = join(UPLOAD_DIR, name);
  const stream = createReadStream(path);

  stream.on('error', () => {
    if (!res.headersSent) res.status(404).json({ error: 'Not found' });
  });

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  stream.pipe(res);
}

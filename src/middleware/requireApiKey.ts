/**
 * Shared-secret authentication for the API server.
 *
 * The server is reachable over the public internet and hands callers an LLM
 * agent with tools. Without this, anyone who finds the host can spend your
 * Anthropic credits and reach anything the agent can reach.
 *
 * Callers send the secret in an `x-api-key` header (n8n: an httpHeaderAuth
 * credential). `/health` stays open so Docker's healthcheck and uptime probes
 * keep working.
 *
 * FAILS CLOSED: if AGENT_API_KEY is not set, every protected route returns 503
 * rather than running unauthenticated. A missing key is a misconfiguration, and
 * the safe response to a misconfiguration is to stop, not to serve.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Routes that stay reachable without the secret. */
const OPEN_PATHS = new Set(['/health']);

/**
 * Prefixes served without the secret.
 *
 * `/files/` hosts pipeline intermediates that third-party generation APIs fetch
 * from their own servers, carrying none of our credentials — so the download
 * cannot require a key. Safety comes from unguessable 32-hex names, a strict
 * servable-name whitelist, and a TTL sweep (see src/render/uploadRoute.ts).
 * Nothing there is listable. Do not put anything private behind this prefix.
 */
const OPEN_PREFIXES = ['/files/'];

function isOpen(path: string): boolean {
  if (OPEN_PATHS.has(path)) return true;
  return OPEN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Compare two secrets without leaking their contents through timing.
 * A plain `===` returns faster the earlier it finds a mismatched byte, which
 * over many attempts reveals the secret one character at a time. Hashing first
 * gives both sides a fixed 32-byte length, so timingSafeEqual never throws on a
 * length mismatch and the comparison cost is identical for every input.
 */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (isOpen(req.path)) {
    next();
    return;
  }

  const expected = process.env.AGENT_API_KEY;

  if (!expected) {
    res.status(503).json({
      error: 'Server is not configured',
      detail:
        'AGENT_API_KEY is not set. Set it in the environment and restart; ' +
        'the server refuses to serve authenticated routes without it.',
    });
    return;
  }

  const provided = req.header('x-api-key');

  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized', detail: 'Missing or invalid x-api-key header' });
    return;
  }

  next();
}

/**
 * Log the auth posture once at boot so a missing key is obvious in `docker logs`
 * rather than being discovered when a workflow starts returning 503.
 */
export function warnIfUnauthenticated(): void {
  if (!process.env.AGENT_API_KEY) {
    console.error('\n🚨 AGENT_API_KEY is NOT set.');
    console.error('   Every route except /health will return 503 until it is.');
    console.error('   Set it in .env, then: docker compose up -d --force-recreate\n');
  } else {
    console.log('🔒 API key auth enabled (x-api-key header required)');
  }
}

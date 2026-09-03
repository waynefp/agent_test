/**
 * What code is this container actually running?
 *
 * WHY THIS EXISTS: twice, a deploy that had not happened looked exactly like a
 * deploy that had. `/render` rejected a body the merged code accepts, and from
 * outside the box there was no way to tell whether the image was stale or the
 * request was wrong — so the guess went the wrong way and cost hours. Reporting
 * the build on `/health` turns that into a five-second check.
 *
 * WHERE THE ANSWER COMES FROM, in order:
 *
 * 1. `GIT_COMMIT` / `BUILD_TIME` env vars, baked into the image by CI at build
 *    time. These cannot drift from the code sitting beside them in the image.
 * 2. The checked-in `VERSION` file. This is a fallback for local runs only. It
 *    is updated by hand, in a separate commit, and is routinely stale — so a
 *    value from it is labelled as such rather than passed off as authoritative.
 *    A confidently wrong version string would recreate the exact problem this
 *    module exists to solve.
 * 3. Nothing. Reported as "unknown", never guessed.
 */

import { readFileSync } from 'node:fs';

export interface BuildInfo {
  /** Full commit SHA, or "unknown". */
  commit: string;
  /** First 7 characters, for eyeballing against `git log`. */
  short: string;
  /** ISO 8601 build timestamp, or null when it was not injected. */
  builtAt: string | null;
  /** How this was determined — so a stale value announces itself. */
  source: 'build arg' | 'VERSION file (may be stale)' | 'unavailable';
}

/** Both paths are tried: cwd for `npm run server`, /app for the image. */
function readVersionFile(): string | null {
  for (const path of ['VERSION', '/app/VERSION']) {
    try {
      const text = readFileSync(path, 'utf8').trim();
      if (text) return text;
    } catch {
      // Absent or unreadable; try the next candidate.
    }
  }
  return null;
}

function resolve(): BuildInfo {
  const injected = process.env.GIT_COMMIT?.trim();
  if (injected) {
    return {
      commit: injected,
      short: injected.slice(0, 7),
      builtAt: process.env.BUILD_TIME?.trim() || null,
      source: 'build arg',
    };
  }

  const fromFile = readVersionFile();
  if (fromFile) {
    return {
      commit: fromFile,
      short: fromFile.slice(0, 7),
      builtAt: null,
      source: 'VERSION file (may be stale)',
    };
  }

  return { commit: 'unknown', short: 'unknown', builtAt: null, source: 'unavailable' };
}

/**
 * Resolved once at startup. It cannot change while the process lives, and a
 * health check should not hit the filesystem on every request.
 */
export const BUILD_INFO: BuildInfo = resolve();

/**
 * Build an ASS subtitle file for burned-in captions and a URL lower-third.
 *
 * Kept separate from the HTTP layer so the timing/escaping rules can be read
 * and tested on their own.
 */

export interface Caption {
  /** Seconds, in FINAL timeline coordinates — i.e. after the lead-in pad. */
  start: number;
  end: number;
  text: string;
}

export interface UrlCard {
  text: string;
  start: number;
  end: number;
}

export interface SubtitleOptions {
  width: number;
  height: number;
  /**
   * Alpine ships DejaVu; Arial does not exist there. libass silently falls back
   * to something ugly if the family is missing, so the default names a font we
   * actually install in the image.
   */
  fontName?: string;
  captionSize?: number;
  urlSize?: number;
  /**
   * Distance from the bottom edge, in pixels. The bottom ~15% of a 9:16 frame
   * sits under the TikTok/Reels chrome, so anything placed there is unreadable
   * in the feed.
   */
  marginV?: number;
}

/** ASS timestamps are H:MM:SS.cc — centiseconds, and the hour is not padded. */
function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

/**
 * Escape text for an ASS dialogue line.
 * Braces open override blocks and a backslash starts an escape, so caption text
 * containing either would otherwise be interpreted as formatting instructions.
 * Newlines become the ASS line break rather than breaking the file format.
 */
function assEscape(text: string): string {
  return text
    .replace(/\\/g, '∖') // set minus — visually a backslash, inert to libass
    .replace(/[{}]/g, '')
    .replace(/\r?\n/g, '\\N')
    .trim();
}

export function buildAss(
  captions: Caption[],
  urlCard: UrlCard | null,
  opts: SubtitleOptions,
): string {
  const {
    width,
    height,
    fontName = 'DejaVu Sans',
    captionSize = Math.round(height * 0.042),
    urlSize = Math.round(height * 0.034),
    marginV = Math.round(height * 0.297),
  } = opts;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,${fontName},${captionSize},&H00FFFFFF,&H00000000,&H80000000,-1,0,1,4,2,2,60,60,${marginV},1
Style: Url,${fontName},${urlSize},&H00FFFFFF,&H00000000,&HB0000000,-1,0,3,6,0,2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const lines = captions
    .filter((c) => c.end > c.start && c.text.trim())
    .map(
      (c) =>
        `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,${assEscape(c.text)}`,
    );

  if (urlCard && urlCard.end > urlCard.start && urlCard.text.trim()) {
    lines.push(
      `Dialogue: 0,${assTime(urlCard.start)},${assTime(urlCard.end)},Url,,0,0,0,,` +
        `{\\fad(350,350)}${assEscape(urlCard.text)}`,
    );
  }

  return `${header}\n${lines.join('\n')}\n`;
}

/**
 * Captions and a URL card compete for the same band of the frame. Rather than
 * stacking them, we keep them apart in TIME — so this reports any overlap and
 * the caller can decide whether to trim or reject.
 */
export function findOverlap(captions: Caption[], urlCard: UrlCard | null): string | null {
  if (!urlCard) return null;
  const clash = captions.find((c) => c.start < urlCard.end && urlCard.start < c.end);
  if (!clash) return null;
  return (
    `Caption "${clash.text.slice(0, 40)}" (${clash.start}s-${clash.end}s) overlaps the URL card ` +
    `(${urlCard.start}s-${urlCard.end}s). They share the same position, so one would cover the other.`
  );
}

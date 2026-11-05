import type { Lang } from "@tint/protocol";

/** A line Grok actually said. Only these ids can be turned into speech, so the MP3 route is not a TTS proxy. */
export interface Line {
  id: string; // 128-bit hex: unguessable, and it is also the cache key of the MP3
  text: string;
  lang: Lang;
  /** TTS characters were charged to the room for this line. */
  charged?: true;
  /** Synthesis attempts, capped so a cache miss loop can't spend the key. */
  tries?: number;
}

export const MAX_LINES = 20;
export const MAX_TRIES = 3;

export const newLineId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

/** Appends a line and keeps only the newest MAX_LINES. */
export function remember(lines: Line[], text: string, lang: Lang): Line {
  const line: Line = { id: newLineId(), text, lang };
  lines.push(line);
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
  return line;
}

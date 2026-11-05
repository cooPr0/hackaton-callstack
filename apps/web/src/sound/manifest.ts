import manifestJson from "@shared/sounds/manifest.json";
import { SOUND_EVENTS, type SoundEvent } from "./events";

interface Entry {
  file: string | null;
  gain: number;
  loop?: boolean;
}

/** Audio files the iOS team drops into shared/sounds (bundled by Vite as URLs). */
const files = import.meta.glob<string>("@shared/sounds/*.{m4a,mp3,wav}", {
  eager: true,
  query: "?url",
  import: "default",
});

const urlByName: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop() ?? path, url]),
);

export interface SoundSpec {
  url: string | null;
  gain: number;
  loop: boolean;
}

const events = (manifestJson as { events: Record<string, Entry> }).events;

/** Resolved spec per event. A missing file (or one not in the manifest) means "silent". */
export const soundSpecs: Record<SoundEvent, SoundSpec> = Object.fromEntries(
  SOUND_EVENTS.map((id) => {
    const e = events[id];
    const url = e?.file ? (urlByName[e.file] ?? urlByName[`${e.file}`] ?? null) : null;
    return [id, { url, gain: Math.min(1, Math.max(0, e?.gain ?? 0.7)), loop: !!e?.loop }];
  }),
) as Record<SoundEvent, SoundSpec>;

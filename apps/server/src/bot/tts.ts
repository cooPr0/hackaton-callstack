import type { Lang } from "@tint/protocol";
import { XAI_BASE_URL } from "./xai";

export interface TtsEnv {
  XAI_API_KEY?: string;
  XAI_BASE_URL?: string;
  /** "off" is the kill switch: no audioUrl is announced and the MP3 route answers 404. */
  XAI_TTS?: string;
  XAI_TTS_VOICE?: string;
}

export const TTS_DEADLINE_MS = 6_000;
/** Characters of speech one room may buy (about 25 lines). */
export const TTS_ROOM_CHARS = 4_000;
const MAX_MP3_BYTES = 1_000_000;

export const ttsAvailable = (env: TtsEnv, spent: number) =>
  Boolean(env.XAI_API_KEY) && env.XAI_TTS !== "off" && spent < TTS_ROOM_CHARS;

/** MP3 of `text`, or null on any failure (the client then shows the text only). */
export async function synthesize(
  env: TtsEnv,
  text: string,
  lang: Lang,
): Promise<ArrayBuffer | null> {
  if (!env.XAI_API_KEY || env.XAI_TTS === "off") return null;
  const t0 = Date.now();
  let status = 0;
  let ok = false;
  try {
    const res = await fetch(`${env.XAI_BASE_URL || XAI_BASE_URL}/tts`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.XAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ text, voice_id: env.XAI_TTS_VOICE || "eve", language: lang }),
      signal: AbortSignal.timeout(TTS_DEADLINE_MS),
    });
    status = res.status;
    if (!res.ok || !res.headers.get("content-type")?.startsWith("audio/")) return null;
    const mp3 = await res.arrayBuffer();
    if (mp3.byteLength === 0 || mp3.byteLength > MAX_MP3_BYTES) return null;
    ok = true;
    return mp3;
  } catch {
    return null;
  } finally {
    console.log(
      JSON.stringify({ xai: "tts", chars: text.length, ms: Date.now() - t0, status, ok }),
    );
  }
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { synthesize, TTS_ROOM_CHARS, ttsAvailable } from "./tts";

afterEach(() => vi.unstubAllGlobals());
vi.spyOn(console, "log").mockImplementation(() => {});
const mp3 = (status = 200, type = "audio/mpeg", bytes = 8) =>
  new Response(new Uint8Array(bytes), { status, headers: { "content-type": type } });

describe("ttsAvailable", () => {
  it("needs a key, no kill switch and room budget left", () => {
    expect(ttsAvailable({ XAI_API_KEY: "k" }, 0)).toBe(true);
    expect(ttsAvailable({}, 0)).toBe(false);
    expect(ttsAvailable({ XAI_API_KEY: "k", XAI_TTS: "off" }, 0)).toBe(false);
    expect(ttsAvailable({ XAI_API_KEY: "k" }, TTS_ROOM_CHARS)).toBe(false);
  });
});

describe("synthesize", () => {
  it("posts text, voice and the room language, and returns the audio", async () => {
    const fetch = vi.fn(async () => mp3());
    vi.stubGlobal("fetch", fetch);
    const out = await synthesize({ XAI_API_KEY: "k" }, "Cześć", "pl");
    expect(out?.byteLength).toBe(8);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/tts");
    expect(JSON.parse(String(init.body))).toEqual({
      text: "Cześć",
      voice_id: "eve",
      language: "pl",
    });
  });

  it("returns null for errors, JSON bodies, empty and oversized audio, and a thrown fetch", async () => {
    for (const r of [
      mp3(500),
      mp3(200, "application/json"),
      mp3(200, "audio/mpeg", 0),
      mp3(200, "audio/mpeg", 2_000_000),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => r),
      );
      expect(await synthesize({ XAI_API_KEY: "k" }, "x", "en")).toBeNull();
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect(await synthesize({ XAI_API_KEY: "k" }, "x", "en")).toBeNull();
  });

  it("never calls the network without a key or when switched off", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await synthesize({}, "x", "pl")).toBeNull();
    expect(await synthesize({ XAI_API_KEY: "k", XAI_TTS: "off" }, "x", "pl")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

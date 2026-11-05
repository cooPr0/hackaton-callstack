import { describe, expect, it } from "vitest";
import { BotSay, Citation, GrokHint, SayAudioPath, sayAudioPath, VoiceReady } from "./server";

const id = "0123456789abcdef0123456789abcdef";

describe("bot.say audioUrl", () => {
  it("accepts only the server's own same-origin MP3 path", () => {
    expect(SayAudioPath.safeParse(sayAudioPath("K7PQX", id)).success).toBe(true);
    for (const bad of [
      "https://evil.com/x.mp3",
      `//evil.com/api/rooms/K7PQX/say/${id}.mp3`,
      "/api/rooms/K7PQX/say/../../x.mp3",
      `/api/rooms/k7pqx/say/${id}.mp3`,
      `/api/rooms/K7PQX/say/${id}.mp3?x=1`,
    ]) {
      expect(SayAudioPath.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("stays optional (v1 bot.say still decodes)", () => {
    expect(BotSay.safeParse({ type: "bot.say", seatId: "s3", text: "x" }).success).toBe(true);
  });
});
describe("grok.hint citations", () => {
  const url = (u: string) => Citation.safeParse({ handle: "kuchnia_pl", url: u }).success;

  it("accepts X post links only", () => {
    expect(url("https://x.com/kuchnia_pl/status/1854000000000000001")).toBe(true);
    expect(url("https://twitter.com/i/web/status/1854000000000000001")).toBe(true);
    for (const bad of [
      "http://x.com/a/status/1",
      "https://x.com.evil.com/a/status/1",
      "https://evil.com/x.com/a/status/1",
      "https://x.com/a/status/1?ref=evil",
      "javascript:alert(1)//https://x.com/a/status/1",
      "https://x.com/a",
    ]) {
      expect(url(bad), bad).toBe(false);
    }
  });

  it("rejects bad handles and more than two citations", () => {
    expect(
      Citation.safeParse({ handle: "@kuchnia", url: "https://x.com/a/status/1" }).success,
    ).toBe(false);
    const c = { handle: "a", url: "https://x.com/a/status/1" };
    const hint = { type: "grok.hint", seatId: "s1", text: "x", citations: [c, c, c] };
    expect(GrokHint.safeParse(hint).success).toBe(false);
  });
});

describe("voice.ready", () => {
  const ready = (url: string) =>
    VoiceReady.safeParse({
      type: "voice.ready",
      seatId: "s2",
      value: "secret",
      expiresAt: 1,
      url,
      model: "grok-voice-latest",
      voice: "eve",
      session: { type: "session.update", session: {} },
    }).success;

  it("only points clients at xAI's realtime endpoint", () => {
    expect(ready("wss://api.x.ai/v1/realtime?model=grok-voice-latest")).toBe(true);
    for (const bad of [
      "ws://api.x.ai/v1/realtime?model=grok-voice-latest",
      "wss://api.x.ai.evil.com/v1/realtime?model=a",
      "wss://evil.com/v1/realtime?model=a",
      "wss://api.x.ai/v1/realtime?model=a&key=b",
    ]) {
      expect(ready(bad), bad).toBe(false);
    }
  });
});

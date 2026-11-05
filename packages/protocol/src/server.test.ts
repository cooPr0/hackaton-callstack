import { describe, expect, it } from "vitest";
import { BotSay, SayAudioPath, sayAudioPath } from "./server";

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

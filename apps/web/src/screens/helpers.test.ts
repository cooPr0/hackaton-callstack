import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { fixture } from "../dev/fixtures";
import { copies } from "../i18n";
import { pl } from "../i18n/pl";
import {
  checkClue,
  isFoldEmulation,
  normalizeClue,
  rankedScores,
  scoresInline,
  winnerOf,
} from "./helpers";

describe("isFoldEmulation", () => {
  it("frames closed screens only for a local game held closed", () => {
    expect(isFoldEmulation(fixture("local-guess1"), "closed")).toBe(true);
    expect(isFoldEmulation(fixture("local-guess1"), "open")).toBe(false);
  });

  it("never frames online screens or the no-view state", () => {
    expect(isFoldEmulation(fixture("secret1-cuegiver"), "closed")).toBe(false);
    expect(isFoldEmulation(fixture("lobby"), "open")).toBe(false);
    expect(isFoldEmulation(null, "closed")).toBe(false);
  });
});

describe("checkClue", () => {
  it("accepts one word in SECRET_1, with Polish letters", () => {
    expect(checkClue("Rosół", "SECRET_1", pl)).toEqual({ ok: true, clue: "Rosół" });
    expect(checkClue("  Źdźbło ", "SECRET_1", pl)).toEqual({ ok: true, clue: "Źdźbło" });
  });

  it("accepts one or two words in SECRET_2 and collapses spaces", () => {
    expect(checkClue("z   marchewką", "SECRET_2", pl)).toEqual({ ok: true, clue: "z marchewką" });
    expect(checkClue("marchewka", "SECRET_2", pl)).toEqual({ ok: true, clue: "marchewka" });
  });

  it("rejects empty, non-letters, too long and too many words", () => {
    expect(checkClue("   ", "SECRET_1", pl)).toEqual({ ok: false, message: pl.clueErrors.empty });
    expect(checkClue("R2D2", "SECRET_1", pl)).toEqual({
      ok: false,
      message: pl.clueErrors.letters,
    });
    expect(checkClue("rosół!", "SECRET_1", pl)).toEqual({
      ok: false,
      message: pl.clueErrors.letters,
    });
    expect(checkClue("a".repeat(25), "SECRET_1", pl)).toEqual({
      ok: false,
      message: pl.clueErrors.tooLong(24),
    });
    expect(checkClue("a".repeat(24), "SECRET_1", pl).ok).toBe(true);
    expect(checkClue("dwa słowa", "SECRET_1", pl)).toEqual({
      ok: false,
      message: pl.clueErrors.oneWord,
    });
    expect(checkClue("aż trzy słowa", "SECRET_2", pl)).toEqual({
      ok: false,
      message: pl.clueErrors.twoWords,
    });
  });

  it("speaks the language it is given", () => {
    expect(checkClue("dwa słowa", "SECRET_1", copies.en)).toEqual({
      ok: false,
      message: copies.en.clueErrors.oneWord,
    });
  });

  it("normalizes tabs and newlines", () => {
    expect(normalizeClue("\tz\nmarchewką ")).toBe("z marchewką");
  });
});

describe("scores", () => {
  it("ranks by score, highest first (the design's order)", () => {
    const names = rankedScores(fixture("reveal")).map((s) => `${s.name} ${s.score}`);
    expect(names).toEqual(["Ola 10", "Grok 8", "Kuba 6"]);
    expect(scoresInline(fixture("reveal"))).toBe("Ola 10, Grok 8, Kuba 6");
  });

  it("keeps seat order on ties and skips open seats", () => {
    const lobby = fixture("lobby");
    const view: PlayerView = {
      ...lobby,
      seats: [
        ...lobby.seats,
        {
          id: "s9",
          name: "Gracz 4",
          kind: "human",
          platform: null,
          score: 0,
          connected: false,
        },
      ],
    };
    expect(rankedScores(view).map((s) => s.name)).toEqual(["Kuba", "Ola", "Grok"]);
  });

  it("carries Grok's fallback flag and leaves humans unmarked", () => {
    const view = fixture("guess1");
    expect(rankedScores(view).every((s) => s.degraded === false)).toBe(true);
    const seats = view.seats.map((s) => (s.kind === "grok" ? { ...s, degraded: true } : s));
    expect(rankedScores({ ...view, seats }).find((s) => s.kind === "grok")?.degraded).toBe(true);
  });

  it("finds the winner, or a tie", () => {
    expect(winnerOf(fixture("gameover"))).toEqual({ kind: "winner", id: "s2", name: "Ola" });
    expect(winnerOf(fixture("lobby"))).toEqual({ kind: "tie" });
  });
});

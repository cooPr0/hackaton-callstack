import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanLine, grokClue, grokGuess, takeCall } from "./grok";

const env = { XAI_API_KEY: "k" };
const yes = () => true;
const stones = [{ seatId: "s2", x: 5, y: 5, n: 1 as const }];
const replies = (...contents: unknown[]) => {
  const fetch = vi.fn();
  for (const c of contents) {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(c) } }] })),
    );
  }
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe("grokGuess", () => {
  it("snaps a taken or off-board cell to a free one", async () => {
    replies({ x: 5, y: 5, line: "Biorę kratkę głębiej." });
    const g = await grokGuess(env, { clues: ["rosół"], stones, lang: "pl" }, yes);
    expect(g && stones.some((s) => s.x === g.x && s.y === g.y)).toBe(false);
    expect(g?.line).toBe("Biorę kratkę głębiej.");
    replies({ x: 99, y: -3, line: "Tu." });
    expect(await grokGuess(env, { clues: [], stones, lang: "pl" }, yes)).toMatchObject({
      x: 23,
      y: 0,
    });
  });

  it("drops a line with a color word or digits but keeps the stone", async () => {
    replies({ x: 1, y: 1, line: "Złoty, ale nie z puszki." });
    expect(await grokGuess(env, { clues: [], stones, lang: "pl" }, yes)).toEqual({ x: 1, y: 1 });
    replies({ x: 1, y: 1, line: "Pole 4,4!" });
    expect(await grokGuess(env, { clues: [], stones, lang: "pl" }, yes)).toEqual({ x: 1, y: 1 });
  });

  it("returns null without a key or budget, without calling xAI", async () => {
    const fetch = replies({ x: 1, y: 1, line: "x" });
    expect(await grokGuess({}, { clues: [], stones, lang: "pl" }, yes)).toBeNull();
    expect(await grokGuess(env, { clues: [], stones, lang: "pl" }, () => false)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("grokClue", () => {
  const input = {
    target: { x: 4, y: 3 },
    phase: "SECRET_1" as const,
    clues: [],
    stones: [],
    lang: "pl" as const,
  };

  it("retries past color words and invalid clues, then accepts a valid one", async () => {
    const fetch = replies({ word: "czerwony" }, { word: "dwa słowa" }, { word: "Rosół" });
    expect(await grokClue(env, input, yes)).toBe("Rosół");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives up after three bad answers", async () => {
    replies({ word: "zielony" }, { word: "niebieski" }, { word: "żółty" });
    expect(await grokClue(env, input, yes)).toBeNull();
  });
});

describe("cleanLine / takeCall", () => {
  it("strips control chars and caps length", () => {
    expect(cleanLine("  Czyli\u0000 rosół‮ z piątku.  ")).toBe("Czyli rosół z piątku.");
    expect(cleanLine("a".repeat(300))).toHaveLength(200);
    expect(cleanLine(42)).toBeUndefined();
  });

  it("allows 30 calls per 10 minutes", () => {
    const calls: number[] = [];
    for (let i = 0; i < 30; i++) expect(takeCall(calls, 1000 + i)).toBe(true);
    expect(takeCall(calls, 2000)).toBe(false);
    expect(takeCall(calls, 1000 + 10 * 60_000)).toBe(true);
  });
});

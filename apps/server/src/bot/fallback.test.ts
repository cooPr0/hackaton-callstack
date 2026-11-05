import { columnHue, validateClue } from "@tint/game-core";
import { BOARD_COLS, BOARD_ROWS, type Stone } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { aimFor, fallbackClue, fallbackGuess, nearestFree } from "./fallback";

const allCells = Array.from({ length: BOARD_COLS * BOARD_ROWS }, (_, i) => ({
  x: i % BOARD_COLS,
  y: Math.floor(i / BOARD_COLS),
}));

describe("fallback bot", () => {
  it("every clue it can produce passes validateClue", () => {
    for (const c of allCells) {
      for (const phase of ["SECRET_1", "SECRET_2"] as const) {
        const text = fallbackClue(c, phase);
        expect(validateClue(text, phase), `${phase} ${text} @${c.x},${c.y}`).toEqual({
          ok: true,
          text,
        });
      }
    }
  });

  it("aims near the clue's hue, inflections included", () => {
    const x = aimFor(["Rosół", "z marchewką"]).x; // latest keyword (marchewka, ~60°) wins
    expect(Math.abs(columnHue(x) - 60)).toBeLessThanOrEqual(15);
    expect(aimFor(["rosołu"])).toEqual(aimFor(["rosół"]));
  });

  it("always returns an in-bounds free cell", () => {
    const stones: Stone[] = [];
    for (let i = 0; i < 40; i++) {
      const g = fallbackGuess(["rosół"], stones, () => 0.99);
      expect(stones.some((s) => s.x === g.x && s.y === g.y)).toBe(false);
      expect(g.x >= 0 && g.x < BOARD_COLS && g.y >= 0 && g.y < BOARD_ROWS).toBe(true);
      stones.push({ seatId: "s4", x: g.x, y: g.y, n: 1 });
    }
    expect(nearestFree({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toEqual({ x: 1, y: 0 });
  });
});

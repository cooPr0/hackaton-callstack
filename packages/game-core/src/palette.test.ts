import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BOARD_CELLS } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { BACKGROUNDS, generatePalette, nearestCellDistance, type Palette } from "./palette";

const committed = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../shared/palette.json", import.meta.url)), "utf8"),
) as Palette;

describe("palette", () => {
  it("has 288 row-major cells", () => {
    expect(committed.cells).toHaveLength(BOARD_CELLS);
    committed.cells.forEach((c, i) => {
      expect(c.y * committed.cols + c.x).toBe(i);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it("committed shared/palette.json matches the generator (run `pnpm palette`)", () => {
    expect(committed).toEqual(generatePalette());
  });

  it("all cells are unique", () => {
    expect(new Set(committed.cells.map((c) => c.hex)).size).toBe(BOARD_CELLS);
  });

  it("no cell melts into either background (ΔE_OK ≥ 0.06)", () => {
    expect(nearestCellDistance(committed, BACKGROUNDS.light)).toBeGreaterThanOrEqual(0.06);
    expect(nearestCellDistance(committed, BACKGROUNDS.dark)).toBeGreaterThanOrEqual(0.06);
  });
});

import { BOARD_CELLS } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { cellAt, hexAt, palette, rows } from "./palette";

describe("palette loader", () => {
  it("loads all 288 cells", () => {
    expect(palette.cells).toHaveLength(BOARD_CELLS);
  });

  it("indexes row-major", () => {
    expect(cellAt(5, 3)).toMatchObject({ x: 5, y: 3 });
    expect(hexAt(23, 11)).toBe(palette.cells[BOARD_CELLS - 1]?.hex);
  });

  it("throws outside the board", () => {
    expect(() => cellAt(24, 0)).toThrow(RangeError);
  });

  it("returns strips of rows", () => {
    const strip = rows(0, 2);
    expect(strip).toHaveLength(3);
    expect(strip[0]).toHaveLength(24);
  });
});

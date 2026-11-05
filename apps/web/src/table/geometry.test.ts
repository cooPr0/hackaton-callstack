import { BOARD_COLS, HINGE_AFTER_X } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import {
  GRID_TRACKS,
  gridColumn,
  gridRow,
  HINGE_TRACK,
  isArrow,
  ringSpan,
  spanArea,
  step,
  zone,
} from "./geometry";

describe("zone", () => {
  const t = { x: 4, y: 4 };
  it("classifies by Chebyshev distance", () => {
    expect(zone(4, 4, t)).toBe("exact");
    expect(zone(5, 5, t)).toBe("near");
    expect(zone(3, 4, t)).toBe("near");
    expect(zone(6, 2, t)).toBe("far");
    expect(zone(2, 5, t)).toBe("far");
    expect(zone(7, 4, t)).toBe("out");
    expect(zone(4, 11, t)).toBe("out");
  });
});

describe("grid columns", () => {
  it("puts the hinge track after column 11", () => {
    expect(HINGE_AFTER_X).toBe(11);
    expect(HINGE_TRACK).toBe(12);
    expect(GRID_TRACKS).toBe(25);
  });

  it("maps x to 1-based grid lines, skipping the hinge", () => {
    expect(gridColumn(0)).toBe(1);
    expect(gridColumn(11)).toBe(12);
    expect(gridColumn(12)).toBe(14);
    expect(gridColumn(BOARD_COLS - 1)).toBe(25);
    expect(gridRow(0)).toBe(1);
    expect(gridRow(11)).toBe(12);
  });
});

describe("ringSpan", () => {
  it("is a (2r+1) square around the target", () => {
    expect(ringSpan({ x: 10, y: 5 }, 1)).toEqual({ x0: 9, x1: 11, y0: 4, y1: 6 });
    expect(ringSpan({ x: 10, y: 5 }, 2)).toEqual({ x0: 8, x1: 12, y0: 3, y1: 7 });
  });

  it("clamps at the corners", () => {
    expect(ringSpan({ x: 0, y: 0 }, 2)).toEqual({ x0: 0, x1: 2, y0: 0, y1: 2 });
    expect(ringSpan({ x: 23, y: 11 }, 2)).toEqual({ x0: 21, x1: 23, y0: 9, y1: 11 });
  });

  it("spans across the hinge track", () => {
    expect(spanArea(ringSpan({ x: 11, y: 5 }, 1))).toEqual({
      gridColumn: "11 / 15",
      gridRow: "5 / 8",
    });
    expect(spanArea(ringSpan({ x: 3, y: 0 }, 1))).toEqual({
      gridColumn: "3 / 6",
      gridRow: "1 / 3",
    });
  });
});

describe("keyboard step", () => {
  it("moves one cell and clamps to the board", () => {
    expect(step({ x: 5, y: 5 }, "ArrowRight")).toEqual({ x: 6, y: 5 });
    expect(step({ x: 0, y: 5 }, "ArrowLeft")).toEqual({ x: 0, y: 5 });
    expect(step({ x: 5, y: 0 }, "ArrowUp")).toEqual({ x: 5, y: 0 });
    expect(step({ x: 23, y: 11 }, "ArrowDown")).toEqual({ x: 23, y: 11 });
    expect(isArrow("ArrowUp")).toBe(true);
    expect(isArrow("Enter")).toBe(false);
  });
});

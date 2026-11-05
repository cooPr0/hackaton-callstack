import { BOARD_COLS, BOARD_ROWS, type Cell, HINGE_AFTER_X } from "@tint/protocol";

/**
 * Board geometry for the table: pure, display-only. The authoritative scoring lives on the
 * server; `zone` only drives styling (the reveal dims what scored nothing).
 *
 * The CSS grid has 25 column tracks: 12 cells, the hinge track, 12 cells.
 */

export type Zone = "exact" | "near" | "far" | "out";

/** Chebyshev distance between two cells. */
export const distance = (a: Cell, b: Cell): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** exact = the target, near = inside 3 × 3, far = inside 5 × 5, out = everything else. */
export function zone(x: number, y: number, target: Cell): Zone {
  const d = distance({ x, y }, target);
  return d === 0 ? "exact" : d === 1 ? "near" : d === 2 ? "far" : "out";
}

/** 0-based index of the hinge track among the grid's column tracks (12). */
export const HINGE_TRACK = HINGE_AFTER_X + 1;

/** Number of column tracks in the board grid (24 cells + the hinge). */
export const GRID_TRACKS = BOARD_COLS + 1;

/** 1-based CSS grid column line for board column x (skips the hinge track). */
export const gridColumn = (x: number): number => (x <= HINGE_AFTER_X ? x + 1 : x + 2);

/** 1-based CSS grid row line for board row y. */
export const gridRow = (y: number): number => y + 1;

export interface Span {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The (2r+1)² square around the target, clamped to the board (inclusive cell bounds). */
export function ringSpan(target: Cell, radius: number): Span {
  return {
    x0: Math.max(0, target.x - radius),
    x1: Math.min(BOARD_COLS - 1, target.x + radius),
    y0: Math.max(0, target.y - radius),
    y1: Math.min(BOARD_ROWS - 1, target.y + radius),
  };
}

/** `grid-column` / `grid-row` values that make an element cover a span (crossing the hinge). */
export function spanArea(s: Span): { gridColumn: string; gridRow: string } {
  return {
    gridColumn: `${gridColumn(s.x0)} / ${gridColumn(s.x1) + 1}`,
    gridRow: `${gridRow(s.y0)} / ${gridRow(s.y1) + 1}`,
  };
}

export type Arrow = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

const STEP: Record<Arrow, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export const isArrow = (key: string): key is Arrow => key in STEP;

/** Keyboard selection: move one cell, clamped to the board. */
export function step(from: Cell, key: Arrow): Cell {
  const [dx, dy] = STEP[key];
  return {
    x: Math.min(BOARD_COLS - 1, Math.max(0, from.x + dx)),
    y: Math.min(BOARD_ROWS - 1, Math.max(0, from.y + dy)),
  };
}

/** Where keyboard selection starts: the board's centre, next to the hinge. */
export const START_CELL: Cell = { x: HINGE_AFTER_X, y: Math.floor(BOARD_ROWS / 2) - 1 };

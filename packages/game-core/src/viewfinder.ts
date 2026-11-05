import {
  BOARD_COLS,
  BOARD_ROWS,
  type Cell,
  VIEWFINDER_H,
  VIEWFINDER_W,
  type ViewfinderWindow,
} from "@tint/protocol";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 7 × 9 window around the target, clamped so it never leaves the board. */
export function viewfinderWindow(t: Cell): ViewfinderWindow {
  return {
    x0: clamp(t.x - 3, 0, BOARD_COLS - VIEWFINDER_W),
    y0: clamp(t.y - 4, 0, BOARD_ROWS - VIEWFINDER_H),
    w: VIEWFINDER_W,
    h: VIEWFINDER_H,
  };
}

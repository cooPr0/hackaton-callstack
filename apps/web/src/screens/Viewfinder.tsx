import type { Cell } from "@tint/protocol";
import type { ReactNode } from "react";
import { Brackets } from "../components/Brackets";
import { StoneDisc } from "../components/StoneDisc";
import { useCopy } from "../i18n";
import { hexAt } from "../palette/palette";
import styles from "./Viewfinder.module.css";

export interface ViewfinderStone {
  x: number;
  y: number;
  name: string;
  grok: boolean;
}

export interface ViewfinderProps {
  window: { x0: number; y0: number; w: number; h: number };
  target: Cell;
  stones?: readonly ViewfinderStone[];
  /** Vertical space the rest of the screen needs; the grid shrinks to leave it free. */
  reservePx?: number;
  /** Rendered under the grid, at the grid's width (the SECRET_2 caption row). */
  caption?: ReactNode;
}

/**
 * The cue giver's 7 × 9 window onto the board, target in corner brackets. No coordinates are
 * rendered or exposed — the cells are anonymous squares.
 */
export function Viewfinder({
  window: w,
  target,
  stones = [],
  reservePx = 400,
  caption,
}: ViewfinderProps) {
  const t = useCopy();
  const cells = [];
  for (let y = w.y0; y < w.y0 + w.h; y++) {
    for (let x = w.x0; x < w.x0 + w.w; x++) {
      const stone = stones.find((s) => s.x === x && s.y === y);
      const isTarget = x === target.x && y === target.y;
      cells.push(
        <div key={`${x}-${y}`} className={styles.cell} style={{ background: hexAt(x, y) }}>
          {isTarget ? <Brackets /> : null}
          {stone ? <StoneDisc name={stone.name} grok={stone.grok} /> : null}
        </div>,
      );
    }
  }
  return (
    <div
      className={styles.frame}
      style={{
        ["--vf-reserve" as string]: `${reservePx}px`,
        ["--vf-ratio" as string]: `${w.w / w.h}`,
      }}
    >
      <div
        className={styles.grid}
        role="img"
        aria-label={t.closed.viewfinder}
        style={{ gridTemplateColumns: `repeat(${w.w}, 1fr)` }}
      >
        {cells}
      </div>
      {caption}
    </div>
  );
}

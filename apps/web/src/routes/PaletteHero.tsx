import { BOARD_COLS, BOARD_ROWS, HINGE_AFTER_X } from "@tint/protocol";
import { rows } from "../palette/palette";
import s from "./PaletteHero.module.css";

/** Grid column for board x: one extra track after HINGE_AFTER_X is the hinge. */
const column = (x: number) => (x <= HINGE_AFTER_X ? x + 1 : x + 2);
const BOARD = rows(0, BOARD_ROWS - 1);

/**
 * The full 24 × 12 board with the hinge, as the wide-window hero on setup/join pages — the
 * open table in miniature. Decorative only: no stones, no target, nothing from a round.
 */
export function PaletteHero({ className }: { className?: string }) {
  return (
    <div
      className={`${s.board} ${className ?? ""}`}
      style={{ ["--cols" as string]: BOARD_COLS / 2 }}
      aria-hidden="true"
    >
      {BOARD.map((row, y) =>
        row.map((hex, x) => (
          <span
            key={hex}
            className={s.cell}
            style={{ background: hex, gridColumn: column(x), gridRow: y + 1 }}
          />
        )),
      )}
    </div>
  );
}

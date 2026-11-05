import { BOARD_COLS, BOARD_ROWS, type Cell, HINGE_AFTER_X } from "@tint/protocol";
import { animate } from "motion";
import { useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { Brackets } from "../components/Brackets";
import { StoneDisc } from "../components/StoneDisc";
import { useCopy } from "../i18n";
import { hexAt } from "../palette/palette";
import styles from "./Board.module.css";
import {
  distance,
  gridColumn,
  gridRow,
  isArrow,
  START_CELL,
  step,
  type Zone,
  zone,
} from "./geometry";

export interface BoardStone {
  x: number;
  y: number;
  name: string;
  grok: boolean;
  second: boolean;
  /** Reveal: the points this stone earned ("+3"), taken from the server awards. */
  badge?: string | null;
  /** Reveal: the order in which badges pop (0, 1, 2…). */
  badgeOrder?: number;
}

export interface BoardProps {
  stones: readonly BoardStone[];
  /** Placement allowed (my turn, guess phase, nothing in flight). */
  interactive: boolean;
  selected: Cell | null;
  /** A stone sent to the server and not yet in the view. */
  ghost?: (Cell & { name: string; grok: boolean }) | null;
  onSelect: (cell: Cell | null) => void;
  onPlace: (cell: Cell) => void;
  /** Waiting for a clue: the board recedes. */
  dimmed?: boolean;
  /** Rotated 90° to fit a portrait screen. */
  portrait?: boolean;
  /** REVEAL only: the public target (`view.reveal.target`); drives zones and the brackets. */
  revealTarget?: Cell | null;
  /** Bump to play the unfold (halves slide out from the hinge). 0 = no intro. */
  intro?: number;
  /** Extra grid items laid over the board (reveal rings). */
  children?: ReactNode;
}

const key = (x: number, y: number) => y * BOARD_COLS + x;

interface CellProps {
  x: number;
  y: number;
  stoneName: string | null;
  stoneGrok: boolean;
  stoneSecond: boolean;
  ghostName: string | null;
  ghostGrok: boolean;
  badge: string | null;
  badgeOrder: number;
  zone: Zone | null;
  dist: number;
  selected: boolean;
  interactive: boolean;
  tabbable: boolean;
  label: string;
  onPick: (x: number, y: number) => void;
}

/** One board cell. Memoised on primitives so a new view only re-renders what changed. */
const BoardCell = memo(function BoardCell({
  x,
  y,
  stoneName,
  stoneGrok,
  stoneSecond,
  ghostName,
  ghostGrok,
  badge,
  badgeOrder,
  zone: cellZone,
  dist,
  selected,
  interactive,
  tabbable,
  label,
  onPick,
}: CellProps) {
  const right = x > HINGE_AFTER_X;
  const occupied = stoneName !== null;
  return (
    <button
      type="button"
      className={styles.cell}
      style={
        {
          "--hex": hexAt(x, y),
          "--d": dist,
          gridColumn: right ? x - HINGE_AFTER_X : x + 1,
          gridRow: gridRow(y),
        } as CSSProperties
      }
      data-i={key(x, y)}
      data-zone={cellZone ?? undefined}
      data-selected={selected ? "" : undefined}
      data-occupied={occupied ? "" : undefined}
      disabled={!interactive || occupied}
      tabIndex={interactive && tabbable ? 0 : -1}
      aria-label={label}
      onClick={() => onPick(x, y)}
    >
      {cellZone === "exact" ? <Brackets /> : null}
      {stoneName !== null ? (
        <StoneDisc name={stoneName} grok={stoneGrok} second={stoneSecond} drop />
      ) : ghostName !== null ? (
        <StoneDisc name={ghostName} grok={ghostGrok} ghost />
      ) : null}
      {badge ? (
        <span
          className={styles.badge}
          style={{ "--order": badgeOrder } as CSSProperties}
          aria-hidden="true"
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
});

/**
 * The 24 × 12 board: one CSS grid with a hinge track, and two half-boards as subgrid items
 * (so the unfold can slide them apart). Cells are real buttons: mouse, touch and keyboard
 * all go through them, so hit-testing survives the portrait rotation.
 */
export function Board({
  stones,
  interactive,
  selected,
  ghost = null,
  onSelect,
  onPlace,
  dimmed = false,
  portrait = false,
  revealTarget = null,
  intro = 0,
  children,
}: BoardProps) {
  const t = useCopy();
  const root = useRef<HTMLElement>(null);
  const leftHalf = useRef<HTMLDivElement>(null);
  const rightHalf = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Unfold (PDF p.4): 220–520 ms the halves slide out from the hinge (left from +50%, right
  // from −50%) on a spring; no zoom. Set the start pose before paint, then animate.
  useLayoutEffect(() => {
    if (!intro) return;
    const halves = [
      [leftHalf.current, "50%"],
      [rightHalf.current, "-50%"],
    ] as const;
    const running = halves.flatMap(([el, from]) => {
      if (!el) return [];
      el.style.opacity = "0";
      if (reduced) return [animate(el, { opacity: [0, 1] }, { duration: 0.2, ease: "linear" })];
      el.style.transform = `translateX(${from})`;
      return [
        animate(
          el,
          { x: [from, "0%"] },
          { type: "spring", duration: 0.5, bounce: 0.15, delay: 0.22 },
        ),
        animate(el, { opacity: [0, 1] }, { duration: 0.14, delay: 0.22, ease: "linear" }),
      ];
    });
    return () => {
      for (const a of running) a.stop();
      for (const [el] of halves) {
        if (el) {
          el.style.opacity = "";
          el.style.transform = "";
        }
      }
    };
  }, [intro, reduced]);

  const byCell = new Map<number, BoardStone>();
  for (const s of stones) byCell.set(key(s.x, s.y), s);
  const occupied = (c: Cell) => byCell.has(key(c.x, c.y));

  // Read the selection through a ref so `pick` stays stable and memoised cells don't re-render.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pick = useCallback(
    (x: number, y: number) => {
      const sel = selectedRef.current;
      if (sel && sel.x === x && sel.y === y) onPlace({ x, y });
      else onSelect({ x, y });
    },
    [onPlace, onSelect],
  );

  const focusCell = (c: Cell) =>
    root.current?.querySelector<HTMLButtonElement>(`[data-i="${key(c.x, c.y)}"]`)?.focus();

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!interactive) return;
    if (isArrow(e.key)) {
      e.preventDefault();
      const next = step(selected ?? START_CELL, e.key);
      onSelect(next);
      // Occupied cells are disabled (unfocusable): keep focus on the board itself.
      if (!occupied(next)) focusCell(next);
      else root.current?.focus();
    } else if (e.key === "Enter" && selected && !occupied(selected)) {
      e.preventDefault();
      onPlace(selected);
    } else if (e.key === "Escape") {
      onSelect(null);
    }
  };

  const tabCell = selected ?? START_CELL;
  const half = (from: number, to: number) => {
    const cells = [];
    for (let y = 0; y < BOARD_ROWS; y++) {
      for (let x = from; x <= to; x++) {
        const s = byCell.get(key(x, y));
        const isSel = !!selected && selected.x === x && selected.y === y;
        const isGhost = !!ghost && ghost.x === x && ghost.y === y;
        cells.push(
          <BoardCell
            key={key(x, y)}
            x={x}
            y={y}
            stoneName={s ? s.name : null}
            stoneGrok={s?.grok ?? false}
            stoneSecond={s?.second ?? false}
            ghostName={isGhost && ghost ? ghost.name : null}
            ghostGrok={isGhost && ghost ? ghost.grok : false}
            badge={s?.badge ?? null}
            badgeOrder={s?.badgeOrder ?? 0}
            zone={revealTarget ? zone(x, y, revealTarget) : null}
            dist={revealTarget ? distance({ x, y }, revealTarget) : 0}
            selected={isSel}
            interactive={interactive}
            tabbable={tabCell.x === x && tabCell.y === y}
            label={s ? t.board.cellTaken(s.name) : isSel ? t.board.cellSelected : t.board.cell}
            onPick={pick}
          />,
        );
      }
    }
    return cells;
  };

  const showChip = interactive && selected && !occupied(selected);

  return (
    <section
      ref={root}
      className={`${styles.board} ${portrait ? styles.portrait : ""}`}
      data-dimmed={dimmed ? "" : undefined}
      data-revealed={revealTarget ? "" : undefined}
      data-interactive={interactive ? "" : undefined}
      aria-label={interactive ? `${t.board.label}. ${t.board.placeHint}` : t.board.label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div ref={leftHalf} className={`${styles.half} ${styles.left}`} data-half="left">
        {half(0, HINGE_AFTER_X)}
      </div>
      <div ref={rightHalf} className={`${styles.half} ${styles.right}`} data-half="right">
        {half(HINGE_AFTER_X + 1, BOARD_COLS - 1)}
      </div>
      {showChip && selected ? (
        <div
          className={styles.chipAnchor}
          data-below={selected.y < 2 ? "" : undefined}
          style={{ gridColumn: gridColumn(selected.x), gridRow: gridRow(selected.y) }}
        >
          <button type="button" className={styles.chip} onClick={() => onPlace(selected)}>
            {t.table.place}
          </button>
        </div>
      ) : null}
      {children}
    </section>
  );
}

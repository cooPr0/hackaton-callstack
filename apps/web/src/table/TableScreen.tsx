import type { Cell, PlayerView } from "@tint/protocol";
import { useCallback, useState } from "react";
import { formatClock, useRemaining } from "../app/clock";
import { cueGiverName, isMyTurn, seatById, turnName } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { PauseButton } from "../components/PauseButton";
import { Toast } from "../components/Toast";
import { type Copy, useCopy } from "../i18n";
import { rankedScores } from "../screens/helpers";
import { Overlays, run } from "../screens/PauseSheet";
import { Board, type BoardStone } from "./Board";
import { EdgeBar } from "./EdgeBar";
import { Rings } from "./Rings";
import { deltasLine, revealTargetOf, stoneBadges } from "./reveal";
import styles from "./TableScreen.module.css";

const isGuess = (v: PlayerView) => v.phase === "GUESS_1" || v.phase === "GUESS_2";
const isSecret = (v: PlayerView) => v.phase === "SECRET_1" || v.phase === "SECRET_2";

/** Selection/sent state only lives for one board state; a new view (stone, turn) resets it. */
const boardKey = (v: PlayerView) => `${v.round}:${v.phase}:${v.stones.length}:${v.turnSeatId}`;

function edgeText(v: PlayerView, t: Copy, botLine: string | null, clock: string | null) {
  const name = cueGiverName(v);
  const secret = isSecret(v);
  let meta: string = t.table.clueOf(name);
  if (v.phase === "GUESS_1") meta = `${meta} · ${t.table.firstStone}`;
  else if (v.phase === "GUESS_2") meta = `${meta} · ${t.table.secondStone}`;
  else if (v.phase === "SECRET_2") meta = t.table.waitingForClue(name);
  else if (v.phase === "REVEAL" || v.phase === "GAME_OVER") meta = t.reveal.shadeOf(name);

  // In REVEAL Grok defends its guess: that line beats whatever it said while guessing.
  const line = (v.phase === "REVEAL" ? v.reveal?.botLine : null) ?? botLine;
  let turn: string | null = null;
  if (isGuess(v) && v.turnSeatId) {
    turn = isMyTurn(v) ? t.table.yourTurn(turnName(v)) : t.table.turnOf(turnName(v));
  } else if (v.phase === "REVEAL") {
    turn = deltasLine(v);
  }
  if (clock && (secret || isGuess(v))) {
    const left = t.table.timeLeft(clock);
    turn = turn ? `${turn} · ${left}` : left;
  }
  return {
    meta,
    waiting: secret && v.clues.length === 0 ? t.table.waitingForClue(name) : null,
    botLine: line ? t.grok.says(line) : null,
    turn,
  };
}

/**
 * The open phone: the shared table (PDF p.4). Reads only the public view — `secret` is
 * stripped by ScreenHost before it gets here and is never touched.
 */
export function TableScreen(props: ScreenProps) {
  const t = useCopy();
  const { view, actions, posture, bot, pending, error } = props;
  const secondsLeft = useRemaining(view?.turnDeadline ?? null);
  const [sel, setSel] = useState<{ key: string; cell: Cell | null }>({ key: "", cell: null });
  const [sent, setSent] = useState<{ key: string; cell: Cell } | null>(null);

  const key = view ? boardKey(view) : "";
  const selected = sel.key === key ? sel.cell : null;
  const inFlight = sent && sent.key === key ? sent.cell : null;
  const canPlace = !!view && isGuess(view) && isMyTurn(view) && !pending && !inFlight;

  const onSelect = useCallback((cell: Cell | null) => setSel({ key, cell }), [key]);
  const onPlace = useCallback(
    (cell: Cell) => {
      if (!canPlace) return;
      setSent({ key, cell });
      setSel({ key, cell: null });
      actions.place(cell.x, cell.y).catch(() => setSent(null));
    },
    [actions, canPlace, key],
  );

  if (!view) return null;

  const portrait = !view.local && posture === "closed";
  // Public reveal data only (never `secret`): present from REVEAL on.
  const revealTarget = revealTargetOf(view);
  const badges = revealTarget ? stoneBadges(view) : new Map<number, string>();
  let order = 0;
  const stones: BoardStone[] = view.stones.map((s, i) => {
    const seat = seatById(view, s.seatId);
    const badge = badges.get(i) ?? null;
    return {
      x: s.x,
      y: s.y,
      name: seat?.name ?? "",
      grok: seat?.kind === "grok",
      second: s.n === 2,
      badge,
      badgeOrder: badge ? order++ : 0,
    };
  });
  const last = view.round >= view.totalRounds;
  const next = (flipped: boolean) =>
    view.phase === "REVEAL" ? (
      <Button
        block={false}
        disabled={pending}
        tabIndex={flipped ? -1 : undefined}
        onClick={() => run(actions.next())}
      >
        {last ? t.table.finish : t.table.nextRound}
      </Button>
    ) : null;
  const turnSeat = seatById(view, view.turnSeatId);
  const ghost =
    inFlight && turnSeat
      ? { ...inFlight, name: turnSeat.name, grok: turnSeat.kind === "grok" }
      : null;

  const clock = secondsLeft === null ? null : formatClock(secondsLeft);
  const text = edgeText(view, t, bot.line, clock);
  const grokTurn = turnSeat?.kind === "grok";
  const bar = (flipped: boolean) => (
    <EdgeBar
      meta={text.meta}
      clues={view.clues}
      waiting={text.waiting}
      botLine={text.botLine}
      turn={text.turn}
      thinking={bot.thinking && grokTurn}
      urgent={secondsLeft !== null && secondsLeft <= 10}
      scores={rankedScores(view)}
      flipped={flipped}
      compact={portrait}
      action={next(flipped)}
    />
  );
  const pause = () => actions.openPause(true);

  return (
    <div className={`${styles.root} ${portrait ? styles.portraitRoot : ""}`}>
      {portrait ? (
        <div className={styles.portraitTop}>
          <PauseButton label={t.closed.pauseLabel} onClick={pause} />
        </div>
      ) : (
        bar(true)
      )}

      <div className={styles.boardArea}>
        <Board
          stones={stones}
          interactive={canPlace}
          selected={canPlace ? selected : null}
          ghost={ghost}
          onSelect={onSelect}
          onPlace={onPlace}
          dimmed={isSecret(view)}
          portrait={portrait}
          revealTarget={revealTarget}
        >
          {revealTarget ? <Rings target={revealTarget} /> : null}
        </Board>
      </div>

      {bar(false)}

      {portrait ? null : (
        <>
          <span className={styles.hinge} aria-hidden="true" />
          <div className={`${styles.hingePause} ${styles.top}`}>
            <PauseButton label={t.closed.pauseLabel} onClick={pause} />
          </div>
          <div className={`${styles.hingePause} ${styles.bottom}`}>
            <PauseButton label={t.closed.pauseLabel} onClick={pause} />
          </div>
        </>
      )}

      <Toast message={error} />
      <Overlays {...props} />
    </div>
  );
}

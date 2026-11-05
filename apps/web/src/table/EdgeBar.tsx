import type { ReactNode } from "react";
import { useCopy } from "../i18n";
import type { RankedScore } from "../screens/helpers";
import styles from "./EdgeBar.module.css";

export interface EdgeBarProps {
  /** Small line above the clue ("Podpowiedź · Kuba · pierwszy kamień"). */
  meta: string;
  /** The clue(s), one per line; empty while the cue giver is thinking. */
  clues: readonly string[];
  /** Shown in the clue slot when there is no clue yet. */
  waiting?: string | null;
  /** Grok's latest line, already formatted. */
  botLine?: string | null;
  /** "Twój ruch, Ola" / "Ruch: Grok". */
  turn?: string | null;
  /** Pulse the turn label (Grok is thinking). */
  thinking?: boolean;
  /** The clock has 10 seconds or less. */
  urgent?: boolean;
  scores: readonly RankedScore[];
  /** The far side of the table: the whole bar is turned 180°. */
  flipped?: boolean;
  compact?: boolean;
  /** A button above the scores (REVEAL: "Następna runda"). */
  action?: ReactNode;
}

/**
 * One edge of the table (PDF p.4): clue on the left, Grok's line, turn and scores on the
 * right. The top copy is rotated 180° so the player opposite reads it the right way up.
 */
export function EdgeBar({
  meta,
  clues,
  waiting = null,
  botLine = null,
  turn = null,
  thinking = false,
  urgent = false,
  scores,
  flipped = false,
  compact = false,
  action = null,
}: EdgeBarProps) {
  const t = useCopy();
  const longest = Math.max(0, ...clues.map((c) => c.length));
  const cls = [styles.bar, flipped ? styles.flipped : "", compact ? styles.compact : ""]
    .join(" ")
    .trim();
  return (
    <section className={cls} aria-hidden={flipped ? true : undefined}>
      <div className={styles.clue}>
        <p className={styles.meta}>{meta}</p>
        {clues.length > 0 ? (
          <p
            className={`display ${styles.words}`}
            data-lines={clues.length}
            data-long={longest > 9 ? "" : undefined}
            data-xlong={longest > 14 ? "" : undefined}
          >
            {clues.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: clues are a fixed, append-only pair and may repeat
              <span key={i} className={styles.word}>
                {c}
                {i < clues.length - 1 ? "," : ""}
              </span>
            ))}
          </p>
        ) : waiting ? (
          <p className={`display ${styles.waiting}`}>{waiting}</p>
        ) : null}
      </div>

      <div className={styles.side}>
        {botLine ? <p className={styles.bot}>{botLine}</p> : null}
        {turn ? (
          <p
            className={styles.turn}
            data-thinking={thinking ? "" : undefined}
            data-urgent={urgent ? "" : undefined}
            aria-live="polite"
          >
            {turn}
          </p>
        ) : null}
        <div className={styles.scoresRow}>
          {action && !compact ? <div className={styles.action}>{action}</div> : null}
          <ol className={styles.scores}>
            {scores.map((s) => (
              <li key={s.id} className={styles.score}>
                <span className={styles.scoreName}>
                  {s.name}
                  {s.degraded ? <span className={styles.degraded}>{t.grok.degraded}</span> : null}
                </span>
                <span className={`display ${styles.scoreValue}`}>{s.score}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {/* Narrow screens: the action gets its own full-width row under the bar. */}
      {action && compact ? <div className={styles.actionRow}>{action}</div> : null}
    </section>
  );
}

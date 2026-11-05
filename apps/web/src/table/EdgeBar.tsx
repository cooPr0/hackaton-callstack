import type { CSSProperties, ReactNode } from "react";
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
  scores: readonly RankedScore[];
  /** The far side of the table: the whole bar is turned 180°. */
  flipped?: boolean;
  compact?: boolean;
  /** A button beside the scores (REVEAL: "Następna runda"). */
  action?: ReactNode;
  /** Bump to write the newest clue on, letter by letter (the unfold, 560 ms on). */
  writeOn?: number;
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
  scores,
  flipped = false,
  compact = false,
  action = null,
  writeOn = 0,
}: EdgeBarProps) {
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
            {clues.map((c, i) => {
              const text = `${c}${i < clues.length - 1 ? "," : ""}`;
              // The newest clue writes itself on after an unfold, letter by letter.
              const write = writeOn > 0 && i === clues.length - 1;
              return (
                <span key={write ? `${i}-${writeOn}` : i} className={styles.word}>
                  {write ? (
                    <>
                      <span aria-hidden="true">
                        {Array.from(text).map((ch, j) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: letters of a fixed string
                            key={j}
                            className={styles.letter}
                            style={{ "--i": j } as CSSProperties}
                          >
                            {ch}
                          </span>
                        ))}
                      </span>
                      <span className="visually-hidden">{text}</span>
                    </>
                  ) : (
                    text
                  )}
                </span>
              );
            })}
          </p>
        ) : waiting ? (
          <p className={`display ${styles.waiting}`}>{waiting}</p>
        ) : null}
      </div>

      <div className={styles.side}>
        {botLine ? <p className={styles.bot}>{botLine}</p> : null}
        {turn ? (
          <p className={styles.turn} data-thinking={thinking ? "" : undefined} aria-live="polite">
            {turn}
          </p>
        ) : null}
        <div className={styles.scoresRow}>
          {action && !compact ? <div className={styles.action}>{action}</div> : null}
          <ol className={styles.scores}>
            {scores.map((s) => (
              <li key={s.id} className={styles.score}>
                <span className={styles.scoreName}>{s.name}</span>
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

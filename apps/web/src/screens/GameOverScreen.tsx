import { seatName } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { ButtonLink } from "../components/Button";
import { Chip } from "../components/Chip";
import { Swatch } from "../components/Swatch";
import { useCopy } from "../i18n";
import { hexOf } from "../palette/palette";
import { ClosedLayout } from "./ClosedLayout";
import styles from "./GameOverScreen.module.css";
import { rankedScores, winnerOf } from "./helpers";

/** Final scores and every round as a sample card (swatch + clues + cue giver). */
export function GameOverScreen(props: ScreenProps) {
  const t = useCopy();
  const { view } = props;
  if (!view) return <ClosedLayout screen={props}>{null}</ClosedLayout>;
  const winner = winnerOf(view);
  const scores = rankedScores(view);

  return (
    <ClosedLayout
      screen={props}
      header={t.gameOver.title}
      pause={false}
      footer={
        <div className={styles.actions}>
          <ButtonLink href="/" variant="secondary">
            {t.gameOver.newGame}
          </ButtonLink>
          <ButtonLink href="/">{t.gameOver.rematch}</ButtonLink>
        </div>
      }
      bodyClassName={styles.body}
      wide="split"
    >
      <h1 className={styles.headline}>
        {winner?.kind === "winner" ? t.gameOver.winner(winner.name) : t.gameOver.tie}
      </h1>

      <ol className={styles.scores} aria-label={t.closed.gameOver.scores}>
        {scores.map((s) => (
          <li
            key={s.id}
            className={styles.score}
            data-winner={winner?.kind === "winner" && winner.id === s.id ? "" : undefined}
          >
            <Chip name={s.name} grok={s.kind === "grok"} hideName size={36} />
            <span className={styles.name}>
              <span className={styles.nameText}>{s.name}</span>
              {s.degraded ? <span className={styles.degraded}>{t.grok.degraded}</span> : null}
            </span>
            <span className={`display ${styles.points}`}>{s.score}</span>
          </li>
        ))}
      </ol>

      {view.history.length > 0 ? (
        <section className={styles.historySection}>
          <h2 className={styles.label}>{t.closed.gameOver.history}</h2>
          <ul className={styles.history}>
            {view.history.map((h) => (
              <li key={h.round} className={styles.card}>
                <Swatch hex={hexOf(h.target)} radius={0} className={styles.swatch} />
                <div className={styles.strip}>
                  <p className={styles.meta}>
                    {t.closed.gameOver.roundN(h.round)} · {seatName(view, h.cueGiverSeatId)}
                  </p>
                  <p className={`display ${styles.clues}`}>{h.clues.join(", ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ClosedLayout>
  );
}

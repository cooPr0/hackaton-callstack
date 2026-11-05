import { cueGiverName, stonesHome } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { ScoreRow } from "../components/ScoreRow";
import { Swatch } from "../components/Swatch";
import { useCopy } from "../i18n";
import { hexOf } from "../palette/palette";
import { ClosedLayout } from "./ClosedLayout";
import { rankedScores } from "./helpers";
import { run } from "./PauseSheet";
import styles from "./RoundCardScreen.module.css";

/**
 * "Po rundzie" (PDF p.3, local + closed + REVEAL): the shade comes back as a sample card with
 * its name — the clues. Then scores and "Dalej".
 */
export function RoundCardScreen(props: ScreenProps) {
  const t = useCopy();
  const { view, actions, pending } = props;
  const reveal = view?.reveal;
  if (!view || !reveal) return <ClosedLayout screen={props}>{null}</ClosedLayout>;

  const last = view.round >= view.totalRounds;
  const clues = view.clues;

  return (
    <ClosedLayout
      screen={props}
      header={t.round.endOf(view.round, view.totalRounds)}
      footer={
        <Button disabled={pending} onClick={() => run(actions.next())}>
          {t.reveal.next}
        </Button>
      }
    >
      <figure className={styles.card}>
        <Swatch hex={hexOf(reveal.target)} radius={0} className={styles.swatch} />
        <figcaption className={styles.strip}>
          <p className={styles.meta}>
            {t.reveal.shadeOf(cueGiverName(view))} · {t.reveal.stonesHome(stonesHome(view))}
          </p>
          <p className={`display ${styles.clues}`}>
            {clues.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: clues are a fixed, append-only pair and may repeat
              <span key={i} className={styles.clue}>
                {c}
                {i < clues.length - 1 ? "," : ""}
              </span>
            ))}
          </p>
        </figcaption>
      </figure>
      <h1 className={styles.headline}>{last ? t.table.finish : t.table.nextRound}</h1>
      <p className={styles.sub}>{last ? t.closed.roundCard.lastSub : t.closed.roundCard.nextSub}</p>
      <div className={styles.scores}>
        <ScoreRow
          scores={rankedScores(view)}
          right={last ? undefined : t.round.header(view.round + 1, view.totalRounds)}
        />
      </div>
    </ClosedLayout>
  );
}

import { cueGiverName } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { ScoreRow } from "../components/ScoreRow";
import { useCopy } from "../i18n";
import { ClosedLayout, HingeRow } from "./ClosedLayout";
import styles from "./HandoffScreens.module.css";
import { rankedScores } from "./helpers";

/**
 * Local pass-and-play privacy gate: the phone goes to the cue giver, who confirms before the
 * shade appears. Renders NO colour from the target (it never receives `secret` anyway).
 */
export function PassScreen(props: ScreenProps) {
  const t = useCopy();
  const { view, actions } = props;
  if (!view) return <ClosedLayout screen={props}>{null}</ClosedLayout>;
  const name = cueGiverName(view);
  const cue = view.cueGiverSeatId;

  return (
    <ClosedLayout
      screen={props}
      header={t.round.header(view.round, view.totalRounds)}
      footer={
        <Button disabled={!cue} onClick={() => cue && actions.unlockSecret(cue)}>
          {t.handoff.iAm(name)}
        </Button>
      }
      bodyClassName={styles.bottom}
    >
      <div className={styles.chip}>
        <Chip name={name} hideName size={72} />
      </div>
      <h1 className={styles.headline}>{t.handoff.pass(name)}</h1>
      <p className={styles.sub}>{t.handoff.passSub}</p>
      <div className={styles.scores}>
        <ScoreRow scores={rankedScores(view)} />
      </div>
    </ClosedLayout>
  );
}

/** Local, phone open during a secret phase: the cue giver must fold before seeing it. */
export function HandoffFoldScreen(props: ScreenProps) {
  const t = useCopy();
  const { view } = props;
  return (
    <ClosedLayout
      screen={props}
      header={view ? t.round.header(view.round, view.totalRounds) : undefined}
      footer={<HingeRow label={t.posture.hint} />}
      center
    >
      <h1 className={styles.headline}>{t.handoff.fold(view ? cueGiverName(view) : "")}</h1>
      <p className={styles.sub}>{t.handoff.foldSub}</p>
    </ClosedLayout>
  );
}

/** Local, phone closed while everyone should be guessing: open it on the table. */
export function HandoffUnfoldScreen(props: ScreenProps) {
  const t = useCopy();
  const { view } = props;
  return (
    <ClosedLayout
      screen={props}
      header={view ? t.round.header(view.round, view.totalRounds) : undefined}
      footer={<HingeRow label={t.posture.hint} />}
      center
    >
      <h1 className={styles.headline}>{t.handoff.unfold}</h1>
      <p className={styles.sub}>{t.handoff.unfoldSub}</p>
    </ClosedLayout>
  );
}

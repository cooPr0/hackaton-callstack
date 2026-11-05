import { useState } from "react";
import { isHost } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Sheet, SheetRow } from "../components/Sheet";
import { useCopy } from "../i18n";
import { scoresInline } from "./helpers";
import styles from "./PauseSheet.module.css";

/** Fire-and-forget an action: the store reports failures through `props.error`. */
export const run = (p: Promise<unknown>) => {
  p.catch(() => {});
};

/** The pause sheet (PDF p.3 "Pauza"): resume, clue rules, end game (host only, confirmed). */
export function PauseSheet({ view, actions, ui }: ScreenProps) {
  const t = useCopy();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const open = !ui.rulesOpen && (ui.pauseOpen || !!view?.paused);

  const resume = () => {
    setConfirmEnd(false);
    actions.openPause(false);
    if (view?.paused) run(actions.pause(false));
  };

  const sub = view
    ? t.closed.pause.sub(t.round.header(view.round, view.totalRounds), scoresInline(view))
    : undefined;

  return (
    <Sheet open={open} onClose={resume} title={t.pause.title} sub={sub}>
      <SheetRow onClick={resume}>{t.pause.resume}</SheetRow>
      <SheetRow onClick={() => actions.openRules(true)}>{t.pause.rules}</SheetRow>
      {view && isHost(view) ? (
        confirmEnd ? (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>{t.pause.endConfirm}</p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmNo}
                onClick={() => setConfirmEnd(false)}
              >
                {t.closed.pause.endNo}
              </button>
              <button
                type="button"
                className={styles.confirmYes}
                onClick={() => {
                  setConfirmEnd(false);
                  run(actions.end());
                }}
              >
                {t.closed.pause.endYes}
              </button>
            </div>
          </div>
        ) : (
          <SheetRow danger onClick={() => setConfirmEnd(true)}>
            {t.pause.end}
          </SheetRow>
        )
      ) : null}
    </Sheet>
  );
}

/** "Zasady podpowiedzi": the clue rules, opened from the pause sheet. */
export function RulesSheet({ actions, ui }: ScreenProps) {
  const t = useCopy();
  const close = () => actions.openRules(false);
  return (
    <Sheet open={ui.rulesOpen} onClose={close} title={t.rules.title}>
      <ol className={styles.rules}>
        {t.rules.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <SheetRow onClick={close}>{t.closed.rulesClose}</SheetRow>
    </Sheet>
  );
}

/** Every screen renders this once: the sheets driven by `ui.pauseOpen` / `ui.rulesOpen`. */
export function Overlays(props: ScreenProps) {
  return (
    <>
      <PauseSheet {...props} />
      <RulesSheet {...props} />
    </>
  );
}

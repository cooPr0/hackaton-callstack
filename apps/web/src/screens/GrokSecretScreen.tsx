import type { ScreenProps } from "../app/types";
import { useCopy } from "../i18n";
import { ClosedLayout, HingeRow } from "./ClosedLayout";
import styles from "./GrokSecretScreen.module.css";

/**
 * "Sekret ma Grok" (PDF p.3): the back of a sample card with a seal — zero colour.
 * Nobody needs to look; the clue arrives on the open table.
 */
export function GrokSecretScreen(props: ScreenProps) {
  const t = useCopy();
  const { view } = props;
  const header = view
    ? `${t.round.header(view.round, view.totalRounds)} · ${t.closed.grokGives}`
    : undefined;

  return (
    <ClosedLayout
      screen={props}
      header={header}
      footer={<HingeRow label={t.secret.unfoldToSend} />}
    >
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.card}>
          <span className={styles.seal} />
          <span className={styles.window} />
        </div>
      </div>
      <h1 className={styles.title}>{t.grok.knows}</h1>
      <p className={styles.quote}>{t.grok.quote}</p>
      <p className={styles.sub}>{t.grok.noOneLooks}</p>
    </ClosedLayout>
  );
}

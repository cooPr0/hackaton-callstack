import { Fragment, type ReactNode } from "react";
import { useCopy } from "../i18n";
import styles from "./ScoreRow.module.css";

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  degraded?: boolean;
}

/** "Ola 10 · Grok 8 · Kuba 6" in bold, with an optional muted note on the right. */
export function ScoreRow({ scores, right }: { scores: readonly ScoreEntry[]; right?: ReactNode }) {
  const t = useCopy();
  const degraded = scores.some((s) => s.degraded);
  return (
    <div className={styles.row}>
      <p className={styles.scores}>
        {scores.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 ? <span className={styles.sep}> · </span> : null}
            <span className={styles.entry}>
              {s.name} {s.score}
            </span>
          </Fragment>
        ))}
      </p>
      {right ? <p className={styles.right}>{right}</p> : null}
      {degraded ? <p className={styles.degraded}>{t.grok.degraded}</p> : null}
    </div>
  );
}

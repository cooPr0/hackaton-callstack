import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { useCopy } from "../i18n";
import { ClosedLayout } from "./ClosedLayout";
import styles from "./ConnectingScreen.module.css";

/** No view yet: the logo while the socket connects, or a retry when it gave up. */
export function ConnectingScreen(props: ScreenProps) {
  const t = useCopy();
  const failed = props.conn === "failed";
  return (
    <ClosedLayout screen={props} center toast={false}>
      <div className={styles.center} aria-live="polite">
        <Logo size={64} className={failed ? undefined : styles.pulse} />
        <p className={styles.text}>{failed ? t.conn.failed : t.conn.connecting}</p>
        {failed ? (
          <Button block={false} onClick={() => props.actions.retryConnection()}>
            {t.conn.retry}
          </Button>
        ) : null}
      </div>
    </ClosedLayout>
  );
}

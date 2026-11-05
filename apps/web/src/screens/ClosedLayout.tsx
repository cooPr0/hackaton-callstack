import type { ReactNode } from "react";
import type { ScreenProps } from "../app/types";
import { HingeIcon } from "../components/HingeIcon";
import { PauseButton } from "../components/PauseButton";
import { Toast } from "../components/Toast";
import { pl } from "../i18n/pl";
import styles from "./ClosedLayout.module.css";
import { Overlays } from "./PauseSheet";

export interface ClosedLayoutProps {
  screen: ScreenProps;
  /** Small header line, top left ("Runda 3 z 6 · patrzy tylko Kuba"). */
  header?: ReactNode;
  /** Show the round pause button top right (default: when there is a header). */
  pause?: boolean;
  footer?: ReactNode;
  /** Show `screen.error` as a toast (screens that show it inline pass false). */
  toast?: boolean;
  /** Vertically centre the body (hand-off screens). */
  center?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * The closed-phone frame: a 402-wide column (max 480 on the open phone), header line with the
 * round pause button, a body and a footer pinned to the bottom. Includes the pause/rules sheets.
 */
export function ClosedLayout({
  screen,
  header,
  pause = header !== undefined,
  footer,
  toast = true,
  center = false,
  bodyClassName,
  children,
}: ClosedLayoutProps) {
  return (
    <div className={styles.root}>
      <div className={styles.column}>
        {header !== undefined || pause ? (
          <header className={styles.header}>
            <p className={styles.headerText}>{header}</p>
            {pause ? (
              <PauseButton
                label={pl.closed.pauseLabel}
                onClick={() => screen.actions.openPause(true)}
              />
            ) : null}
          </header>
        ) : null}
        <main className={`${styles.body} ${center ? styles.center : ""} ${bodyClassName ?? ""}`}>
          {children}
        </main>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
      <Toast message={toast ? screen.error : null} />
      <Overlays {...screen} />
    </div>
  );
}

/** The footer row from the design: hinge icon + a bold instruction. */
export function HingeRow({
  label,
  submit = false,
  disabled = false,
  form,
}: {
  label: string;
  /** id of the form to submit when the row lives outside it (the layout footer). */
  form?: string;
  /** Render as the form's submit button (local secret: tapping it sends the clue). */
  submit?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <HingeIcon />
      <span>{label}</span>
    </>
  );
  return submit ? (
    <button
      type="submit"
      form={form}
      className={`${styles.hinge} ${styles.hingeButton}`}
      disabled={disabled}
    >
      {content}
    </button>
  ) : (
    <p className={styles.hinge}>{content}</p>
  );
}

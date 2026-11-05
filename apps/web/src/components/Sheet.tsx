import { type ReactNode, useEffect, useId, useRef } from "react";
import styles from "./Sheet.module.css";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet with a frosted panel. Positioned absolutely, so it covers the nearest
 * `position: relative` screen (works inside the scaled /dev frames too).
 * Escape or a tap on the scrim calls onClose.
 */
export function Sheet({ open, onClose, title, sub, children }: SheetProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={styles.layer}>
      <button type="button" className={styles.scrim} onClick={onClose} tabIndex={-1}>
        <span className="visually-hidden">{title}</span>
      </button>
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

/** One tappable row of a sheet, separated by hairlines. */
export function SheetRow({
  children,
  onClick,
  danger = false,
  aside,
  pressed,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  /** Muted value on the right, e.g. the state of a toggle. */
  aside?: ReactNode;
  /** Makes the row a toggle button (aria-pressed). */
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.row} ${danger ? styles.danger : ""}`}
      onClick={onClick}
      aria-pressed={pressed}
    >
      <span>{children}</span>
      {aside ? <span className={styles.aside}>{aside}</span> : null}
    </button>
  );
}

import styles from "./Brackets.module.css";

/**
 * Four L-shaped corner marks just outside a cell — the viewfinder's target marker.
 * Place inside a `position: relative` cell. Colour follows the text colour
 * (Cocoa Spice in light mode, Cold Steel in dark).
 */
export function Brackets({ className }: { className?: string }) {
  return (
    <span className={`${styles.brackets} ${className ?? ""}`} aria-hidden="true">
      <span className={`${styles.corner} ${styles.tl}`} />
      <span className={`${styles.corner} ${styles.tr}`} />
      <span className={`${styles.corner} ${styles.bl}`} />
      <span className={`${styles.corner} ${styles.br}`} />
    </span>
  );
}

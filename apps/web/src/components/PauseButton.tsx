import styles from "./PauseButton.module.css";

/** The round pause button from the top-right of every closed screen. */
export function PauseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className={styles.pause} onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect x="3" y="2" width="3.5" height="12" rx="1.2" fill="currentColor" />
        <rect x="9.5" y="2" width="3.5" height="12" rx="1.2" fill="currentColor" />
      </svg>
    </button>
  );
}

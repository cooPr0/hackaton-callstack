import { initialOf } from "./Chip";
import styles from "./StoneDisc.module.css";

export interface StoneDiscProps {
  name: string;
  grok?: boolean;
  /** Second stone of the round (n = 2): drawn with a double ring. */
  second?: boolean;
  /** Spring in on mount (stones placed on the table). */
  drop?: boolean;
  /** Sent but not yet confirmed by the server. */
  ghost?: boolean;
}

/**
 * A stone as drawn on the board: humans are a light disc with the initial and a dark ring,
 * Grok is a dark disc with a light dot. The colours are physical (same in both themes).
 * Sized by its parent cell; the initial uses `--stone-font` (default 13px).
 */
export function StoneDisc({
  name,
  grok = false,
  second = false,
  drop = false,
  ghost = false,
}: StoneDiscProps) {
  const cls = [
    styles.stone,
    grok ? styles.grok : "",
    second ? styles.second : "",
    drop ? styles.drop : "",
    ghost ? styles.ghost : "",
  ]
    .join(" ")
    .trim();
  return (
    <span className={cls} aria-hidden="true">
      {grok ? <span className={styles.dot} /> : initialOf(name)}
    </span>
  );
}

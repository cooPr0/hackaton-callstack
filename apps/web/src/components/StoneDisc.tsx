import { initialOf } from "./Chip";
import styles from "./StoneDisc.module.css";

/**
 * A stone as drawn on the board: humans are a light disc with the initial and a dark ring,
 * Grok is a dark disc with a light dot. The colours are physical (same in both themes).
 */
export function StoneDisc({ name, grok = false }: { name: string; grok?: boolean }) {
  return (
    <span className={`${styles.stone} ${grok ? styles.grok : ""}`} aria-hidden="true">
      {grok ? <span className={styles.dot} /> : initialOf(name)}
    </span>
  );
}

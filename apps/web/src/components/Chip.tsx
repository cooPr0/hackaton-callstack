import styles from "./Chip.module.css";

export interface ChipProps {
  name: string;
  grok?: boolean;
  /** Hide the name under the circle (e.g. inside a seat row that prints it already). */
  hideName?: boolean;
  /** Dimmed outline, e.g. an open seat nobody has taken yet. */
  empty?: boolean;
  size?: number;
}

export const initialOf = (name: string): string =>
  (name.trim()[0] ?? "?").toLocaleUpperCase("pl-PL");

/** Player chip: a circle with the initial, name below. Grok is a solid dark circle. */
export function Chip({
  name,
  grok = false,
  hideName = false,
  empty = false,
  size = 40,
}: ChipProps) {
  const circleCls = [styles.circle, grok ? styles.grok : "", empty ? styles.empty : ""]
    .join(" ")
    .trim();
  return (
    <span className={styles.chip}>
      <span
        className={circleCls}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {grok ? <span className={styles.dot} /> : empty ? "" : initialOf(name)}
      </span>
      {hideName ? null : <span className={styles.name}>{name}</span>}
    </span>
  );
}

import type { Cell } from "@tint/protocol";
import { useId } from "react";
import { ringSpan, spanArea } from "./geometry";
import styles from "./Rings.module.css";

/**
 * Reveal rings around the public target: the 3 × 3 "house" solid, the 5 × 5 dashed.
 * Each ring is a grid item spanning its cells (clamped at the edges, crossing the hinge track),
 * drawn on with stroke-dashoffset. The dashed ring is revealed through a mask so its dashes
 * stay put while the line draws.
 */
export function Rings({ target }: { target: Cell }) {
  const id = useId();
  const maskId = `${id}-mask`;
  return (
    <>
      <div className={`${styles.ring} ${styles.far}`} style={spanArea(ringSpan(target, 2))}>
        <svg className={styles.svg} aria-hidden="true">
          <mask id={maskId}>
            <rect className={`${styles.rect} ${styles.draw} ${styles.maskRect}`} pathLength={100} />
          </mask>
          <rect className={`${styles.rect} ${styles.dashed}`} mask={`url(#${maskId})`} />
        </svg>
      </div>
      <div className={`${styles.ring} ${styles.near}`} style={spanArea(ringSpan(target, 1))}>
        <svg className={styles.svg} aria-hidden="true">
          <rect className={`${styles.rect} ${styles.draw} ${styles.solid}`} pathLength={100} />
        </svg>
      </div>
    </>
  );
}

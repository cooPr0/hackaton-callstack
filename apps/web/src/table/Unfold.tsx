import type { Phase, PlayerView } from "@tint/protocol";
import { useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sound } from "../sound/useSound";
import styles from "./Unfold.module.css";

/** PDF p.4 "Rozłożenie" timeline (ms). The halves (Board) and clue (EdgeBar) share it. */
export const UNFOLD = {
  cornersEnd: 180,
  seal: 180,
  halvesStart: 220,
  clueStart: 560,
  letterStagger: 25,
} as const;

const isGuess = (p: Phase | undefined) => p === "GUESS_1" || p === "GUESS_2";
const isSecret = (p: Phase | undefined) => p === "SECRET_1" || p === "SECRET_2";

/**
 * When the table should play the unfold. Returns a token that grows by one per unfold.
 * - Local: the table mounts in a guess phase — the phone was just opened (closed → open).
 * - Online (or a local Grok round watched open): the phase goes SECRET_n → GUESS_n.
 */
export function useUnfoldIntro(view: PlayerView | null): number {
  const phase = view?.phase;
  const [token, setToken] = useState(() => (view?.local && isGuess(phase) ? 1 : 0));
  const prev = useRef(phase);
  // Layout effect: the new token renders before paint, so the halves never flash in place.
  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = phase;
    if (isSecret(was) && isGuess(phase)) setToken((n) => n + 1);
  }, [phase]);
  return token;
}

const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

/**
 * The first beats of the unfold, drawn at the hinge before the board arrives:
 * 0–180 ms the viewfinder corners close in, 180 ms the seal (a black square) scales in,
 * then everything fades as the halves slide out. Plays the `seal` and `unfold` cues on time.
 * Mount it with a fresh `key` for each unfold.
 */
export function UnfoldSeal() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const timers = [
      window.setTimeout(() => sound.play("seal"), UNFOLD.seal),
      window.setTimeout(() => sound.play("unfold"), UNFOLD.halvesStart),
    ];
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [reduced]);

  // Reduced motion: no corners, no seal — the board just crossfades in.
  if (reduced) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      {CORNERS.map(([dx, dy]) => (
        <span
          key={`${dx}${dy}`}
          className={styles.corner}
          style={{ "--dx": dx, "--dy": dy } as CSSProperties}
        />
      ))}
      <span className={styles.seal} />
    </div>
  );
}

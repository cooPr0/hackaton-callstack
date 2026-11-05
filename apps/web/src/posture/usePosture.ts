import { useEffect, useSyncExternalStore } from "react";
import type { Posture } from "../app/types";
import { OPEN_SHAPE_QUERY, type PostureSource, resolvePosture, SEGMENTS_QUERY } from "./detect";
import { usePostureOverride } from "./postureStore";

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface PostureInfo {
  posture: Posture;
  source: PostureSource;
}

/** Effective posture: manual override → Viewport Segments → window shape. */
export function usePosture(): PostureInfo {
  const override = usePostureOverride((s) => s.override);
  const segments = useMedia(SEGMENTS_QUERY);
  const wideLandscape = useMedia(OPEN_SHAPE_QUERY);
  return resolvePosture({ override, segments, wideLandscape });
}

const isTyping = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);

/** "F" folds/unfolds (emulation). Ignored while typing. */
export function usePostureHotkey(current: Posture) {
  const setOverride = usePostureOverride((s) => s.setOverride);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(document.activeElement)) return;
      setOverride(current === "open" ? "closed" : "open");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, setOverride]);
}

import type { Posture } from "../app/types";

export type PostureSource = "override" | "segments" | "shape";

/** Dual-screen / foldable laid flat with a vertical hinge (Viewport Segments API). */
export const SEGMENTS_QUERY = "(horizontal-viewport-segments: 2)";
/** Fallback: a wide landscape window behaves like the open table (iPhone Duo open ≈ 1036 × 828). */
export const OPEN_SHAPE_QUERY = "(orientation: landscape) and (min-width: 900px)";

export interface PostureInputs {
  override: Posture | null;
  segments: boolean;
  wideLandscape: boolean;
}

export function resolvePosture({ override, segments, wideLandscape }: PostureInputs): {
  posture: Posture;
  source: PostureSource;
} {
  if (override) return { posture: override, source: "override" };
  if (segments) return { posture: "open", source: "segments" };
  return { posture: wideLandscape ? "open" : "closed", source: "shape" };
}

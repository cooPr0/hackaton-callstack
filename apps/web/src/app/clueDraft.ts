import type { PlayerView } from "@tint/protocol";
import type { Posture, UiState } from "./types";

/**
 * Local mode: the cue giver typed a clue on the closed phone and unfolded it without pressing
 * Enter. Returns the draft to send, or null when nothing should be sent.
 *
 * Only on a real closed → open transition, only in SECRET_1/2 of a local game, only when the
 * phone was unlocked by the cue giver (so the person who typed it is the one who saw the shade),
 * and only for a human cue giver this device holds. The server still validates the clue.
 */
export function draftToSendOnUnfold(
  prev: Posture | null,
  posture: Posture,
  view: PlayerView | null,
  ui: Pick<UiState, "clueDraft" | "secretUnlockedFor">,
): string | null {
  if (prev !== "closed" || posture !== "open" || !view?.local) return null;
  if (view.phase !== "SECRET_1" && view.phase !== "SECRET_2") return null;
  const cue = view.cueGiverSeatId;
  if (!cue || ui.secretUnlockedFor !== cue || !view.you.includes(cue)) return null;
  const text = ui.clueDraft.trim();
  return text ? text : null;
}

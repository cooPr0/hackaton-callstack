import type { PlayerView } from "@tint/protocol";
import { cueGiverIsGrok, isCueGiver } from "./roles";
import type { Posture, ScreenId, UiState } from "./types";

/**
 * Seam 2: which screen to show. Pure — derived only from the server view, the device posture
 * and UI-local state. See docs/web/PLAN.md §5 for the table this implements.
 *
 * Online: every device shows its own role; posture only picks the table layout.
 * Local (one device holds every human seat): posture drives the choreography, and the
 * secret is only ever shown while CLOSED and after the cue giver confirmed they hold the phone.
 */
export function selectScreen(
  view: PlayerView | null,
  posture: Posture,
  ui: Pick<UiState, "secretUnlockedFor">,
): ScreenId {
  if (!view) return "connecting";

  switch (view.phase) {
    case "LOBBY":
      return "lobby";

    case "GAME_OVER":
      return "game-over";

    case "SECRET_1":
    case "SECRET_2": {
      const grokGives = cueGiverIsGrok(view);
      if (view.local) {
        if (grokGives) return posture === "closed" ? "grok-secret" : "table";
        if (posture === "open") return "handoff-fold";
        return ui.secretUnlockedFor === view.cueGiverSeatId ? "secret" : "pass";
      }
      if (isCueGiver(view)) return "secret";
      if (grokGives) return posture === "closed" ? "grok-secret" : "table";
      return "table";
    }

    case "GUESS_1":
    case "GUESS_2":
      return view.local && posture === "closed" ? "handoff-unfold" : "table";

    case "REVEAL":
      return view.local && posture === "closed" ? "round-card" : "table";
  }
}

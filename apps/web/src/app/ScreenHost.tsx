import type { PlayerView } from "@tint/protocol";
import { registry } from "../screens/registry";
import { viewForScreen } from "./publicView";
import { selectScreen } from "./selectScreen";
import type { BotState, ConnState, Posture, UiState, WebActions } from "./types";

export interface ScreenHostProps {
  view: PlayerView | null;
  posture: Posture;
  ui: UiState;
  actions: WebActions;
  bot?: BotState;
  conn?: ConnState;
  pending?: boolean;
  error?: string | null;
}

export const idleBot: BotState = { thinking: false, line: null, lineAt: null };

/**
 * The one place a view becomes pixels: selectScreen → privacy filter → registered screen.
 * Used by RoomPage (live) and the /dev gallery (fixtures), so both render identically.
 */
export function ScreenHost({
  view,
  posture,
  ui,
  actions,
  bot = idleBot,
  conn = "open",
  pending = false,
  error = null,
}: ScreenHostProps) {
  const id = selectScreen(view, posture, ui);
  const Screen = registry[id];
  return (
    <Screen
      view={viewForScreen(view, id)}
      actions={actions}
      posture={posture}
      ui={ui}
      bot={bot}
      conn={conn}
      pending={pending}
      error={error}
    />
  );
}

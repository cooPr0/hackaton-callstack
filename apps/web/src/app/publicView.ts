import type { PlayerView } from "@tint/protocol";
import type { ScreenId } from "./types";

/**
 * PRIVACY: strip the secret unless the round is public. REVEAL shows it. GAME_OVER is public
 * too, but the server omits `secret` there and puts past targets in `history`. Anything
 * rendered on the shared table (or on any screen other than the cue giver's private `secret`
 * screen) must go through this — in local mode the device legitimately holds the secret, but
 * the open table is public.
 */
export function publicView(view: PlayerView): PlayerView {
  if (view.phase === "REVEAL" || view.phase === "GAME_OVER" || !view.secret) return view;
  const { secret: _secret, ...rest } = view;
  return rest;
}

/** The view a given screen is allowed to see. Only `secret` gets the raw view. */
export function viewForScreen(view: PlayerView | null, screen: ScreenId): PlayerView | null {
  if (!view) return null;
  return screen === "secret" ? view : publicView(view);
}

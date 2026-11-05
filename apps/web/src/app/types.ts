import type { PlayerView } from "@tint/protocol";

/** Physical posture of the (possibly emulated) foldable. */
export type Posture = "open" | "closed";

/** Every top-level screen RoomPage can show. Chosen by `selectScreen` (seam 2). */
export const SCREEN_IDS = [
  "connecting",
  "lobby",
  "pass",
  "secret",
  "grok-secret",
  "handoff-fold",
  "handoff-unfold",
  "table",
  "round-card",
  "game-over",
] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

/** UI-only state that never goes to the server. */
export interface UiState {
  /** Local mode: the seat that tapped "Jestem X, pokaż odcień" for the current secret. */
  secretUnlockedFor: string | null;
  pauseOpen: boolean;
  rulesOpen: boolean;
  /**
   * The clue the cue giver is typing, kept here (not in the screen) so local mode can send it
   * when the phone is unfolded without pressing Enter. Cleared on every phase change.
   */
  clueDraft: string;
}

export interface BotState {
  thinking: boolean;
  /** Latest `bot.say` line and when it arrived (ms). */
  line: string | null;
  lineAt: number | null;
  /** v1.1: that line as speech, a path relative to the API base (absent = text only). */
  audioUrl: string | null;
}

export type ConnState = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "failed";

/**
 * Seam 1: what a screen may ask for. Screens never talk to the network or compute rules —
 * the store implements these. Promises reject with an Error whose `code` is a protocol ErrorCode.
 */
export interface WebActions {
  start(): Promise<void>;
  submitClue(text: string): Promise<void>;
  place(x: number, y: number): Promise<void>;
  next(): Promise<void>;
  pause(paused: boolean): Promise<void>;
  end(): Promise<void>;
  /** Local mode privacy gate: the named seat confirms they hold the phone. */
  unlockSecret(seatId: string): void;
  openPause(open: boolean): void;
  openRules(open: boolean): void;
  /** Mirror of the clue input (see UiState.clueDraft). */
  setClueDraft(text: string): void;
  /** Manual fold/unfold (emulation); null = follow the device. */
  setPosture(posture: Posture | null): void;
  retryConnection(): void;
  leave(): void;
}

/**
 * Props every registered screen receives.
 * `view` is already privacy-filtered by RoomPage: only the `secret` screen gets the raw view;
 * every other screen gets `publicView(view)` (no `secret` before REVEAL).
 */
export interface ScreenProps {
  view: PlayerView | null;
  actions: WebActions;
  posture: Posture;
  ui: UiState;
  bot: BotState;
  conn: ConnState;
  /** True while an action from this client awaits its ack. */
  pending: boolean;
  /** Short-lived error message to show inline (already translated). */
  error: string | null;
}

import type {
  Cell,
  HistoryEntry,
  Mode,
  Phase,
  Platform,
  Reveal,
  SeatKind,
  Stone,
  ViewfinderWindow,
} from "@tint/protocol";

/**
 * Server-internal game state (lives in the Room Durable Object, persisted to ctx.storage).
 * Clients never see this — they get a PlayerView built by `projectView` (apps/server).
 * The engine itself (`apply`, scoring, viewfinder, clue validation) is P1's first branch.
 */
export interface SeatState {
  id: string;
  name: string;
  kind: SeatKind;
  platform: Platform | null;
  score: number;
  /** SHA-256 hex of the seat token; null while an online seat is unclaimed or for Grok. */
  tokenHash: string | null;
  connected: boolean;
  degraded?: boolean;
}

export interface RoundState {
  round: number;
  cueGiverSeatId: string;
  target: Cell;
  window: ViewfinderWindow;
  clues: string[];
  stones: Stone[];
  /** Guessers in placement order for the current GUESS phase — Grok first. */
  turnOrder: string[];
  turnIndex: number;
  turnDeadline: number | null;
  reveal?: Reveal;
}

export interface GameState {
  code: string;
  mode: Mode;
  local: boolean;
  botMode: "grok" | "fallback";
  phase: Phase;
  totalRounds: number;
  paused: boolean;
  hostSeatId: string;
  seats: SeatState[];
  current: RoundState | null;
  history: HistoryEntry[];
  /** Monotonic, bumped on every transition; sent as `view.seq`. */
  seq: number;
  /** Seed for target picking so tests are deterministic. */
  rngSeed: number;
  createdAt: number;
}

/** Engine actions. Client messages map 1:1; `bot.*` and `timeout` come from the DO alarm. */
export type Action =
  | { type: "start"; by: string }
  | { type: "clue"; seatId: string; text: string }
  | { type: "stone"; seatId: string; x: number; y: number }
  | { type: "skip"; seatId: string; reason: "timeout" | "disconnected" }
  | { type: "next"; by: string }
  | { type: "pause"; paused: boolean; by: string }
  | { type: "end"; by: string };

export type EngineResult =
  | { ok: true; state: GameState }
  | { ok: false; code: import("@tint/protocol").ErrorCode; message: string };

import { z } from "zod";
import { Cell, Lang, Mode, Phase, Platform, RoomCode, SeatId, SeatKind, Stone } from "./common";
import { VIEWFINDER_H, VIEWFINDER_W } from "./constants";

export const SeatView = z.object({
  id: SeatId,
  name: z.string().min(1).max(24),
  kind: SeatKind,
  /** null while an online seat is still open (nobody joined). */
  platform: Platform.nullable(),
  score: z.number().int(),
  connected: z.boolean(),
  /** Grok seat only: true when the bot fell back to the heuristic (API down / budget hit). */
  degraded: z.boolean().optional(),
});
export type SeatView = z.infer<typeof SeatView>;

export const ViewfinderWindow = z.object({
  x0: z.number().int().min(0),
  y0: z.number().int().min(0),
  w: z.literal(VIEWFINDER_W),
  h: z.literal(VIEWFINDER_H),
});
export type ViewfinderWindow = z.infer<typeof ViewfinderWindow>;

/**
 * SECURITY: `secret` is present ONLY on connections that control the cue-giver seat
 * (phases SECRET_1..GUESS_2), or for everyone in REVEAL / GAME_OVER. The server builds a
 * separate PlayerView per connection; never broadcast one shared payload.
 */
export const Secret = z.object({ target: Cell, window: ViewfinderWindow });
export type Secret = z.infer<typeof Secret>;

export const Award = z.object({
  seatId: SeatId,
  delta: z.number().int(),
  reason: z.enum(["exact", "near", "far", "house"]),
});
export type Award = z.infer<typeof Award>;

export const Reveal = z.object({
  target: Cell,
  awards: z.array(Award),
  botLine: z.string().max(200).optional(),
});
export type Reveal = z.infer<typeof Reveal>;

export const HistoryEntry = z.object({
  round: z.number().int().min(1),
  cueGiverSeatId: SeatId,
  target: Cell,
  clues: z.array(z.string()),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const PlayerView = z.object({
  v: z.literal(1),
  roomCode: RoomCode,
  mode: Mode,
  local: z.boolean(),
  /** v1.1: room language. Absent from v1 servers: treat as "pl". */
  lang: Lang.optional(),
  phase: Phase,
  /** 0 in LOBBY, then 1..totalRounds */
  round: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
  paused: z.boolean(),
  hostSeatId: SeatId,
  seats: z.array(SeatView),
  /** Seat ids this connection controls (all humans in local mode). */
  you: z.array(SeatId),
  cueGiverSeatId: SeatId.nullable(),
  turnSeatId: SeatId.nullable(),
  /** Epoch ms; null when no timer runs (local mode, non-GUESS phases). */
  turnDeadline: z.number().int().nullable(),
  clues: z.array(z.string()),
  stones: z.array(Stone),
  secret: Secret.optional(),
  reveal: Reveal.optional(),
  history: z.array(HistoryEntry),
});
export type PlayerView = z.infer<typeof PlayerView>;

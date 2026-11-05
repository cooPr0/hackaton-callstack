import { z } from "zod";
import { Mode, Platform, RoomCode, SeatId, SeatKind } from "./common";
import { DEFAULT_ROUNDS, MAX_ROUNDS, MAX_SEATS, MIN_ROUNDS, PROTOCOL_VERSION } from "./constants";

/** POST /api/rooms */
export const CreateRoomRequest = z.object({
  mode: Mode,
  rounds: z.number().int().min(MIN_ROUNDS).max(MAX_ROUNDS).default(DEFAULT_ROUNDS),
  /** true = pass-and-play on one device: the response carries tokens for ALL human seats. */
  local: z.boolean(),
  /** Creator's platform (used for the host seat). */
  platform: Platform,
  seats: z
    .array(z.object({ name: z.string().min(1).max(24), kind: SeatKind }))
    .min(2)
    .max(MAX_SEATS),
  /** "fallback" skips the xAI API (playtester / offline demo). */
  botMode: z.enum(["grok", "fallback"]).default("grok"),
});
export type CreateRoomRequest = z.input<typeof CreateRoomRequest>;

export const SeatCredential = z.object({ seatId: SeatId, token: z.string().min(16) });
export type SeatCredential = z.infer<typeof SeatCredential>;

export const CreateRoomResponse = z.object({ code: RoomCode, seats: z.array(SeatCredential) });
export type CreateRoomResponse = z.infer<typeof CreateRoomResponse>;

/** POST /api/rooms/:code/join — claims the first open human seat (online rooms only). */
export const JoinRoomRequest = z.object({ name: z.string().min(1).max(24), platform: Platform });
export type JoinRoomRequest = z.infer<typeof JoinRoomRequest>;
export const JoinRoomResponse = SeatCredential;
export type JoinRoomResponse = z.infer<typeof JoinRoomResponse>;

/** GET /api/health */
export const HealthResponse = z.object({
  ok: z.literal(true),
  version: z.string(),
  protocol: z.literal(PROTOCOL_VERSION),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

/** Error body for any non-2xx HTTP response. */
export const HttpError = z.object({ code: z.string(), message: z.string() });
export type HttpError = z.infer<typeof HttpError>;

/** WS URL: `${base}/api/rooms/${code}/ws?token=${token}&pv=1` */
export const wsPath = (code: string, token: string) =>
  `/api/rooms/${code}/ws?token=${encodeURIComponent(token)}&pv=${PROTOCOL_VERSION}`;

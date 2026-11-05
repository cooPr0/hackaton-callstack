import { z } from "zod";
import { Cid, SeatId } from "./common";
import { PROTOCOL_VERSION, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./constants";
import { ErrorCode } from "./errors";
import { PlayerView } from "./view";

export const Welcome = z.object({
  type: z.literal("welcome"),
  seatIds: z.array(SeatId),
  serverTime: z.number().int(),
  protocol: z.literal(PROTOCOL_VERSION),
});
/** Full snapshot after every state change. Clients drop any seq ≤ the last one they applied. */
export const ViewMessage = z.object({
  type: z.literal("view"),
  seq: z.number().int().min(0),
  view: PlayerView,
});
export const BotStatus = z.object({
  type: z.literal("bot.status"),
  seatId: SeatId,
  state: z.enum(["thinking", "idle"]),
});
/** Same-origin path to the MP3 of one Grok line: `/api/rooms/:code/say/:lineId.mp3`. */
export const SayAudioPath = z
  .string()
  .regex(
    new RegExp(`^/api/rooms/[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}/say/[a-f0-9]{32}\\.mp3$`),
  );
export const sayAudioPath = (code: string, lineId: string) =>
  `/api/rooms/${code}/say/${lineId}.mp3`;

export const BotSay = z.object({
  type: z.literal("bot.say"),
  seatId: SeatId,
  text: z.string().min(1).max(200),
  /**
   * v1.1: Grok's line as speech, relative to the API base URL. Absent when speech is off,
   * over budget or unavailable: show the text only. Respect the client's sound toggle.
   */
  audioUrl: SayAudioPath.optional(),
});
/** An X post Grok's hint leans on. Only post links on x.com / twitter.com pass. */
export const Citation = z.object({
  handle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
  url: z
    .string()
    .regex(/^https:\/\/(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web|i)\/status\/\d{1,25}$/),
});
export type Citation = z.infer<typeof Citation>;

/** v1.1: answer to `grok.ask`, sent only to the asking socket. Never contains the target. */
export const GrokHint = z.object({
  type: z.literal("grok.hint"),
  seatId: SeatId,
  text: z.string().min(1).max(200),
  citations: z.array(Citation).max(2),
});

/**
 * v1.1: an ephemeral xAI realtime secret for one seat, sent to the asking socket only.
 * Connect to `url` with `Sec-WebSocket-Protocol: xai-client-secret.<value>`, send `session`
 * as the first message, then stream PCM16. Audio never goes through our server.
 */
export const VoiceReady = z.object({
  type: z.literal("voice.ready"),
  seatId: SeatId,
  value: z.string().min(1).max(512),
  /** Epoch seconds; the secret only opens a session before this. */
  expiresAt: z.number().int(),
  url: z.string().regex(/^wss:\/\/api\.x\.ai\/v1\/realtime\?model=[A-Za-z0-9._-]{1,64}$/),
  model: z.string().min(1).max(64),
  voice: z.string().min(1).max(32),
  session: z.object({
    type: z.literal("session.update"),
    session: z.record(z.string(), z.unknown()),
  }),
});

export const Ack = z.object({ type: z.literal("ack"), cid: Cid });
export const ErrorMessage = z.object({
  type: z.literal("error"),
  cid: Cid.optional(),
  code: ErrorCode,
  message: z.string(),
});
export const Pong = z.object({ type: z.literal("pong") });

export const ServerMessage = z.discriminatedUnion("type", [
  Welcome,
  ViewMessage,
  BotStatus,
  BotSay,
  GrokHint,
  VoiceReady,
  Ack,
  ErrorMessage,
  Pong,
]);
export type ServerMessage = z.infer<typeof ServerMessage>;
export type ServerMessageType = ServerMessage["type"];

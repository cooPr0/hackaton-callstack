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
  Ack,
  ErrorMessage,
  Pong,
]);
export type ServerMessage = z.infer<typeof ServerMessage>;
export type ServerMessageType = ServerMessage["type"];

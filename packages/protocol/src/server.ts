import { z } from "zod";
import { Cid, SeatId } from "./common";
import { PROTOCOL_VERSION } from "./constants";
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
export const BotSay = z.object({
  type: z.literal("bot.say"),
  seatId: SeatId,
  text: z.string().min(1).max(200),
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

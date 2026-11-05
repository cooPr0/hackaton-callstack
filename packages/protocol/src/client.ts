import { z } from "zod";
import { Cid, Platform, SeatId, X, Y } from "./common";
import { CLUE_MAX_CHARS, PROTOCOL_VERSION } from "./constants";

const msg = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ type: z.literal(type), cid: Cid, ...shape });

export const Hello = msg("hello", {
  pv: z.literal(PROTOCOL_VERSION),
  platform: Platform,
  name: z.string().min(1).max(24).optional(),
});
export const GameStart = msg("game.start", {});
export const ClueSubmit = msg("clue.submit", {
  seatId: SeatId,
  text: z.string().trim().min(1).max(CLUE_MAX_CHARS),
});
export const StonePlace = msg("stone.place", { seatId: SeatId, x: X, y: Y });
export const RoundNext = msg("round.next", {});
export const PauseSet = msg("pause.set", { paused: z.boolean() });
export const GameEnd = msg("game.end", {});
export const Ping = msg("ping", {});
/**
 * v1.1: ask Grok for a hint grounded in recent X posts. Answered with `grok.hint` to this socket
 * only. `draft` (SECRET_* only, the cue giver's candidate word) must pass the clue rules.
 */
export const GrokAsk = msg("grok.ask", {
  seatId: SeatId,
  draft: z.string().trim().min(1).max(CLUE_MAX_CHARS).optional(),
});

export const ClientMessage = z.discriminatedUnion("type", [
  Hello,
  GameStart,
  ClueSubmit,
  StonePlace,
  RoundNext,
  PauseSet,
  GameEnd,
  Ping,
  GrokAsk,
]);
export type ClientMessage = z.infer<typeof ClientMessage>;
export type ClientMessageType = ClientMessage["type"];

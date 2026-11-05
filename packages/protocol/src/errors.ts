import { z } from "zod";

export const ERROR_CODES = [
  "PROTOCOL_MISMATCH",
  "BAD_REQUEST",
  "BAD_TOKEN",
  "NOT_YOUR_TURN",
  "NOT_YOUR_SEAT",
  "CELL_TAKEN",
  "INVALID_CLUE",
  "COLOR_WORD",
  "WRONG_PHASE",
  "PAUSED",
  "RATE_LIMITED",
  "ROOM_FULL",
  "ROOM_NOT_FOUND",
  "INTERNAL",
] as const;
export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

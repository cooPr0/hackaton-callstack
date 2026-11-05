import { z } from "zod";
import {
  BOARD_COLS,
  BOARD_ROWS,
  MODES,
  PHASES,
  PLATFORMS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SEAT_KINDS,
} from "./constants";

export const Mode = z.enum(MODES);
export type Mode = z.infer<typeof Mode>;
export const Phase = z.enum(PHASES);
export type Phase = z.infer<typeof Phase>;
export const SeatKind = z.enum(SEAT_KINDS);
export type SeatKind = z.infer<typeof SeatKind>;
export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;

export const RoomCode = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`));
export const SeatId = z.string().min(1).max(32);
/** Client message id, echoed in ack/error for idempotency. */
export const Cid = z.string().min(1).max(64);

export const X = z
  .number()
  .int()
  .min(0)
  .max(BOARD_COLS - 1);
export const Y = z
  .number()
  .int()
  .min(0)
  .max(BOARD_ROWS - 1);
export const Cell = z.object({ x: X, y: Y });
export type Cell = z.infer<typeof Cell>;

export const Stone = z.object({
  seatId: SeatId,
  x: X,
  y: Y,
  /** 1 = placed in GUESS_1, 2 = placed in GUESS_2 */
  n: z.union([z.literal(1), z.literal(2)]),
});
export type Stone = z.infer<typeof Stone>;

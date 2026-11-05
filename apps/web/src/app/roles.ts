import type { PlayerView, SeatView } from "@tint/protocol";

/** Read-only helpers over a PlayerView. Display logic only — never game rules. */

export const seatById = (view: PlayerView, id: string | null | undefined): SeatView | undefined =>
  id ? view.seats.find((s) => s.id === id) : undefined;

export const seatName = (view: PlayerView, id: string | null | undefined): string =>
  seatById(view, id)?.name ?? "";

export const isCueGiver = (view: PlayerView): boolean =>
  !!view.cueGiverSeatId && view.you.includes(view.cueGiverSeatId);

export const cueGiverIsGrok = (view: PlayerView): boolean =>
  seatById(view, view.cueGiverSeatId)?.kind === "grok";

export const isMyTurn = (view: PlayerView): boolean =>
  !!view.turnSeatId && view.you.includes(view.turnSeatId);

export const isHost = (view: PlayerView): boolean => view.you.includes(view.hostSeatId);

export const grokSeat = (view: PlayerView): SeatView | undefined =>
  view.seats.find((s) => s.kind === "grok");

export const cueGiverName = (view: PlayerView): string => seatName(view, view.cueGiverSeatId);
export const turnName = (view: PlayerView): string => seatName(view, view.turnSeatId);

/** Seats with scores, in seat order (the design lists them that way). */
export const scores = (view: PlayerView) =>
  view.seats.map((s) => ({ id: s.id, name: s.name, kind: s.kind, score: s.score }));

/** Points gained this round per seat (REVEAL only). */
export function roundDeltas(view: PlayerView): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of view.reveal?.awards ?? []) out[a.seatId] = (out[a.seatId] ?? 0) + a.delta;
  return out;
}

/** Stones inside the 3 × 3 "house" this round = the cue giver's house awards. */
export const stonesHome = (view: PlayerView): number =>
  (view.reveal?.awards ?? []).filter((a) => a.reason === "house").reduce((n, a) => n + a.delta, 0);

/** Stones visible inside the cue giver's viewfinder window (for SECRET_2). */
export function stonesInWindow(view: PlayerView) {
  const w = view.secret?.window;
  if (!w) return [];
  return view.stones.filter(
    (s) => s.x >= w.x0 && s.x < w.x0 + w.w && s.y >= w.y0 && s.y < w.y0 + w.h,
  );
}

/** Humans who joined (non-null platform) plus Grok. */
export const participants = (view: PlayerView): number =>
  view.seats.filter((s) => s.kind === "grok" || s.platform !== null).length;

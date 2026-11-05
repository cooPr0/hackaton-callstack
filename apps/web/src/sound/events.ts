import type { PlayerView } from "@tint/protocol";

/** Event ids from docs/SOUND.md (shared with iOS). */
export const SOUND_EVENTS = [
  "ui.tap",
  "seal",
  "unfold",
  "fold",
  "clue.write",
  "turn.yours",
  "grok.thinking",
  "stone.grok",
  "stone.place",
  "stone.reject",
  "reveal",
  "score.exact",
  "score.near",
  "score.far",
  "round.end",
  "game.win",
  "error",
] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];

const isGuess = (v: PlayerView) => v.phase === "GUESS_1" || v.phase === "GUESS_2";

/**
 * Which sounds a view change should trigger on THIS device. Pure, derived only from views,
 * so every client in a cross-play room decides for itself (e.g. "turn.yours" plays only for
 * the device whose turn it is).
 */
export function soundEventsFor(prev: PlayerView | null, next: PlayerView): SoundEvent[] {
  if (!prev || prev.roomCode !== next.roomCode) return [];
  const out: SoundEvent[] = [];

  if (next.clues.length > prev.clues.length && isGuess(next)) out.push("clue.write");

  const seen = new Set(prev.stones.map((s) => `${s.x},${s.y}`));
  for (const s of next.stones) {
    if (seen.has(`${s.x},${s.y}`)) continue;
    const kind = next.seats.find((seat) => seat.id === s.seatId)?.kind;
    out.push(kind === "grok" ? "stone.grok" : "stone.place");
  }

  const myTurnNow = !!next.turnSeatId && next.you.includes(next.turnSeatId) && isGuess(next);
  const myTurnBefore = !!prev.turnSeatId && prev.you.includes(prev.turnSeatId) && isGuess(prev);
  if (myTurnNow && (!myTurnBefore || prev.turnSeatId !== next.turnSeatId)) out.push("turn.yours");

  if (next.phase === "REVEAL" && prev.phase !== "REVEAL") {
    out.push("reveal");
    for (const a of next.reveal?.awards ?? []) {
      if (a.reason === "exact") out.push("score.exact");
      else if (a.reason === "near") out.push("score.near");
      else if (a.reason === "far") out.push("score.far");
    }
  }

  if (prev.phase === "REVEAL" && next.phase !== "REVEAL" && next.phase !== "GAME_OVER")
    out.push("round.end");
  if (next.phase === "GAME_OVER" && prev.phase !== "GAME_OVER") out.push("game.win");
  return out;
}

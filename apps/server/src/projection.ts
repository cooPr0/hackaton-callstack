import { type GameState, turnSeat } from "@tint/game-core";
import type { PlayerView } from "@tint/protocol";

const SECRET_PHASES = new Set(["SECRET_1", "GUESS_1", "SECRET_2", "GUESS_2"]);

/**
 * The only way game state reaches a client, built per connection (`seatIds` = the seats that
 * socket controls). Fields are whitelisted, never spread from state, so a new state field
 * (tokenHash, rngSeed…) can't leak by accident.
 *
 * `secret` goes only to a connection controlling the cue giver during SECRET_1..GUESS_2, or to
 * everyone in REVEAL. Local mode controls every human seat, so it does get `secret`. That's by
 * design: privacy is the closed device, and the client renders it only in closed posture.
 */
export function projectView(g: GameState, seatIds: string[]): PlayerView {
  const r = g.current;
  const cue = r?.cueGiverSeatId ?? null;
  const view: PlayerView = {
    v: 1,
    roomCode: g.code,
    mode: g.mode,
    local: g.local,
    lang: g.lang,
    phase: g.phase,
    round: r?.round ?? g.history.at(-1)?.round ?? 0,
    totalRounds: g.totalRounds,
    paused: g.paused,
    hostSeatId: g.hostSeatId,
    seats: g.seats.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      platform: s.platform,
      score: s.score,
      connected: s.connected,
      ...(s.kind === "grok" ? { degraded: s.degraded ?? false } : {}),
    })),
    you: seatIds,
    cueGiverSeatId: cue,
    turnSeatId: turnSeat(g),
    turnDeadline: r?.turnDeadline ?? null,
    clues: r?.clues ?? [],
    stones: r?.stones ?? [],
    history: g.history,
  };
  const isCue = cue !== null && seatIds.includes(cue);
  if (r && ((isCue && SECRET_PHASES.has(g.phase)) || g.phase === "REVEAL")) {
    view.secret = { target: r.target, window: r.window };
  }
  if (r?.reveal && g.phase === "REVEAL") view.reveal = r.reveal;
  return view;
}

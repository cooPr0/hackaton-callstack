import {
  BOARD_COLS,
  BOARD_ROWS,
  type Cell,
  type CreateRoomRequest,
  DEFAULT_LANG,
  type ErrorCode,
  type Phase,
} from "@tint/protocol";
import { validateClue } from "./clue";
import { nextRandom } from "./rng";
import { awardsFor } from "./scoring";
import type { Action, EngineResult, GameState, SeatState } from "./types";
import { viewfinderWindow } from "./viewfinder";

/** Parsed (defaults applied) create-room body. */
export type CreateRoom = Required<Pick<CreateRoomRequest, "rounds" | "botMode">> &
  CreateRoomRequest;

const fail = (code: ErrorCode, message: string): EngineResult => ({ ok: false, code, message });
const ok = (state: GameState): EngineResult => ({ ok: true, state });

const isSecret = (p: Phase): p is "SECRET_1" | "SECRET_2" => p === "SECRET_1" || p === "SECRET_2";
const isGuess = (p: Phase) => p === "GUESS_1" || p === "GUESS_2";

/** An online human seat nobody has claimed yet. */
export const isOpenSeat = (s: SeatState) => s.kind === "human" && s.tokenHash === null;

/**
 * Seats s1..sN; s1 (the creator) is host. Every seat starts with tokenHash null: the server
 * assigns tokens (host only online, every human locally).
 */
export function createGame(
  req: CreateRoom,
  code: string,
  seed: number,
  now = Date.now(),
): EngineResult {
  if (req.seats[0]?.kind !== "human")
    return fail("BAD_REQUEST", "seat 1 is the host and must be human");
  if (req.seats.filter((s) => s.kind === "grok").length !== 1) {
    return fail("BAD_REQUEST", "exactly one grok seat");
  }
  const seats: SeatState[] = req.seats.map((s, i) => ({
    id: `s${i + 1}`,
    name: s.name,
    kind: s.kind,
    platform: s.kind === "grok" ? null : i === 0 || req.local ? req.platform : null,
    score: 0,
    tokenHash: null,
    connected: s.kind === "grok",
  }));
  return ok({
    code,
    mode: req.mode,
    local: req.local,
    botMode: req.botMode,
    lang: req.lang ?? DEFAULT_LANG,
    phase: "LOBBY",
    totalRounds: req.rounds,
    paused: false,
    hostSeatId: "s1",
    seats,
    current: null,
    history: [],
    seq: 0,
    rngSeed: seed,
    createdAt: now,
  });
}

/** The seat whose stone is due (GUESS phases), regardless of pause. */
export function turnSeat(g: GameState): string | null {
  const r = g.current;
  return r && isGuess(g.phase) ? (r.turnOrder[r.turnIndex] ?? null) : null;
}

/** The seat that must act right now, or null (lobby, reveal, paused, game over). */
export function actor(g: GameState): string | null {
  if (g.paused || !g.current) return null;
  return isSecret(g.phase) ? g.current.cueGiverSeatId : turnSeat(g);
}

/**
 * Unique per turn. Timers and bot moves remember the key they were scheduled for and are
 * dropped when it no longer matches. That makes them idempotent across alarm retries, and a
 * bot reply that arrives after the turn moved on can't act.
 */
export const turnKey = (g: GameState) =>
  `${g.current?.round ?? 0}|${g.phase}|${actor(g)}|${g.current?.turnIndex ?? 0}`;

function cueGiverFor(g: GameState, round: number): string {
  const grok = g.seats.find((s) => s.kind === "grok");
  if (g.mode === "grok" && grok) return grok.id;
  const humans = g.seats.filter((s) => s.kind === "human");
  return humans[(round - 1) % humans.length]?.id ?? g.hostSeatId;
}

/** Grok first, then humans in seat order. Mode `ty`: Grok is the only guesser. */
function guessersFor(g: GameState, cue: string): string[] {
  const others = g.seats.filter((s) => s.id !== cue);
  const grok = others.filter((s) => s.kind === "grok").map((s) => s.id);
  if (g.mode === "ty") return grok;
  return [...grok, ...others.filter((s) => s.kind !== "grok").map((s) => s.id)];
}

function pickTarget(g: GameState): Cell {
  const [rx, s1] = nextRandom(g.rngSeed);
  const [ry, s2] = nextRandom(s1);
  g.rngSeed = s2;
  return { x: Math.floor(rx * BOARD_COLS), y: Math.floor(ry * BOARD_ROWS) };
}

function beginRound(g: GameState, round: number) {
  const cueGiverSeatId = cueGiverFor(g, round);
  const target = pickTarget(g);
  g.current = {
    round,
    cueGiverSeatId,
    target,
    window: viewfinderWindow(target),
    clues: [],
    stones: [],
    turnOrder: guessersFor(g, cueGiverSeatId),
    turnIndex: 0,
    turnDeadline: null,
  };
  g.phase = "SECRET_1";
}

/** History holds finished rounds only, so a revealed round is archived when play leaves REVEAL. */
function archive(g: GameState) {
  const r = g.current;
  if (r?.reveal && !g.history.some((h) => h.round === r.round)) {
    g.history.push({
      round: r.round,
      cueGiverSeatId: r.cueGiverSeatId,
      target: r.target,
      clues: r.clues,
    });
  }
}

function gameOver(g: GameState) {
  archive(g);
  g.current = null; // nothing of an unfinished round (its target) survives into GAME_OVER
  g.phase = "GAME_OVER";
  g.paused = false;
}

/** Pure: returns the next state or an error code; never mutates `prev`. */
export function apply(prev: GameState, a: Action): EngineResult {
  if (prev.paused && a.type !== "pause" && a.type !== "end")
    return fail("PAUSED", "game is paused");
  const g = structuredClone(prev);
  const r = g.current;
  const isSeat = (id: string) => g.seats.some((s) => s.id === id);

  switch (a.type) {
    case "start": {
      if (g.phase !== "LOBBY") return fail("WRONG_PHASE", "game already started");
      if (a.by !== g.hostSeatId) return fail("NOT_YOUR_SEAT", "only the host can start");
      g.seats = g.seats.filter((s) => !isOpenSeat(s));
      beginRound(g, 1);
      return ok(g);
    }
    case "clue": {
      if (!r || !isSecret(g.phase)) return fail("WRONG_PHASE", "no clue is due");
      if (a.seatId !== r.cueGiverSeatId)
        return fail("NOT_YOUR_TURN", "only the cue giver gives clues");
      const clue = validateClue(a.text, g.phase);
      if (!clue.ok) return fail(clue.code, "clue rejected");
      r.clues.push(clue.text);
      g.phase = g.phase === "SECRET_1" ? "GUESS_1" : "GUESS_2";
      r.turnIndex = 0;
      return ok(g);
    }
    case "stone":
    case "skip": {
      if (!r || !isGuess(g.phase)) return fail("WRONG_PHASE", "no stone is due");
      if (a.seatId !== turnSeat(g)) return fail("NOT_YOUR_TURN", "not your turn");
      if (a.type === "stone") {
        if (
          !Number.isInteger(a.x) ||
          !Number.isInteger(a.y) ||
          a.x < 0 ||
          a.x >= BOARD_COLS ||
          a.y < 0 ||
          a.y >= BOARD_ROWS
        ) {
          return fail("BAD_REQUEST", "cell out of bounds");
        }
        if (r.stones.some((s) => s.x === a.x && s.y === a.y))
          return fail("CELL_TAKEN", "cell taken");
        r.stones.push({ seatId: a.seatId, x: a.x, y: a.y, n: g.phase === "GUESS_1" ? 1 : 2 });
      }
      r.turnIndex++;
      r.turnDeadline = null;
      if (r.turnIndex < r.turnOrder.length) return ok(g);
      if (g.phase === "GUESS_1") {
        g.phase = "SECRET_2";
        return ok(g);
      }
      const awards = awardsFor(
        r,
        g.seats.map((s) => s.id),
      );
      for (const aw of awards) {
        const seat = g.seats.find((s) => s.id === aw.seatId);
        if (seat) seat.score += aw.delta;
      }
      r.reveal = { target: r.target, awards };
      g.phase = "REVEAL";
      return ok(g);
    }
    case "next": {
      if (!r || g.phase !== "REVEAL") return fail("WRONG_PHASE", "not in reveal");
      if (!isSeat(a.by)) return fail("NOT_YOUR_SEAT", "unknown seat");
      archive(g);
      if (r.round < g.totalRounds) beginRound(g, r.round + 1);
      else gameOver(g);
      return ok(g);
    }
    case "pause": {
      if (g.phase === "LOBBY" || g.phase === "GAME_OVER")
        return fail("WRONG_PHASE", "nothing to pause");
      if (!isSeat(a.by)) return fail("NOT_YOUR_SEAT", "unknown seat");
      g.paused = a.paused;
      return ok(g);
    }
    case "end": {
      if (a.by !== g.hostSeatId) return fail("NOT_YOUR_SEAT", "only the host can end the game");
      if (g.phase === "GAME_OVER") return fail("WRONG_PHASE", "game already over");
      gameOver(g);
      return ok(g);
    }
  }
}

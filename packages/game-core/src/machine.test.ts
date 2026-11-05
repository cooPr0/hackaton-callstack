import { describe, expect, it } from "vitest";
import { actor, apply, type CreateRoom, createGame, turnKey, turnSeat } from "./machine";
import type { Action, EngineResult, GameState } from "./types";

const ok = (r: EngineResult): GameState => {
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.state;
};
const err = (r: EngineResult) => (r.ok ? "ok" : r.code);
const run = (g: GameState, ...actions: Action[]) => actions.reduce((s, a) => ok(apply(s, a)), g);

const req = (over: Partial<CreateRoom> = {}): CreateRoom => ({
  mode: "stol",
  rounds: 2,
  local: false,
  platform: "web",
  botMode: "fallback",
  seats: [
    { name: "Kuba", kind: "human" },
    { name: "Ola", kind: "human" },
    { name: "Ania", kind: "human" },
    { name: "Grok", kind: "grok" },
  ],
  ...over,
});

/** Lobby with s1 (host) and s2 claimed, s3 left open. */
function lobby(over: Partial<CreateRoom> = {}) {
  const g = ok(createGame(req(over), "K7PQX", 42, 0));
  for (const s of g.seats) if (s.id === "s1" || s.id === "s2") s.tokenHash = "h";
  return g;
}

/** Plays the current round to REVEAL: everyone stones a free cell next to the last one. */
function playRound(g: GameState): GameState {
  let s = g;
  let x = 0;
  for (const phase of ["SECRET_1", "SECRET_2"] as const) {
    const r = s.current;
    if (!r) throw new Error("no round");
    expect(s.phase).toBe(phase);
    s = ok(
      apply(s, {
        type: "clue",
        seatId: r.cueGiverSeatId,
        text: phase === "SECRET_1" ? "rosół" : "z marchewką",
      }),
    );
    expect(turnSeat(s)).toBe(r.turnOrder[0]);
    while (turnSeat(s)) {
      const seatId = turnSeat(s) as string;
      s = ok(apply(s, { type: "stone", seatId, x: x++, y: 11 }));
    }
  }
  expect(s.phase).toBe("REVEAL");
  return s;
}

describe("createGame", () => {
  it("rejects a non-human host and anything but exactly one grok", () => {
    expect(
      err(
        createGame(
          req({
            seats: [
              { name: "G", kind: "grok" },
              { name: "A", kind: "human" },
            ],
          }),
          "K7PQX",
          1,
        ),
      ),
    ).toBe("BAD_REQUEST");
    expect(
      err(
        createGame(
          req({
            seats: [
              { name: "A", kind: "human" },
              { name: "B", kind: "human" },
            ],
          }),
          "K7PQX",
          1,
        ),
      ),
    ).toBe("BAD_REQUEST");
  });
});

describe("machine", () => {
  it("only the host starts; unclaimed seats are dropped", () => {
    expect(err(apply(lobby(), { type: "start", by: "s2" }))).toBe("NOT_YOUR_SEAT");
    const g = run(lobby(), { type: "start", by: "s1" });
    expect(g.seats.map((s) => s.id)).toEqual(["s1", "s2", "s4"]);
    expect([g.phase, g.current?.cueGiverSeatId, g.current?.turnOrder]).toEqual([
      "SECRET_1",
      "s1",
      ["s4", "s2"],
    ]);
  });

  it("plays a full 2-round game with Grok first, rotation, scores and history", () => {
    let g = run(lobby(), { type: "start", by: "s1" });
    g = playRound(g);
    expect(g.history).toEqual([]); // current round is not history until play leaves REVEAL
    const total = (st: GameState) => st.seats.reduce((n, s) => n + s.score, 0);
    expect(total(g)).toBe((g.current?.reveal?.awards ?? []).reduce((n, a) => n + a.delta, 0));
    g = run(g, { type: "next", by: "s2" });
    expect([g.phase, g.current?.round, g.current?.cueGiverSeatId]).toEqual(["SECRET_1", 2, "s2"]);
    expect(g.current?.turnOrder).toEqual(["s4", "s1"]);
    g = run(playRound(g), { type: "next", by: "s1" });
    expect([g.phase, g.current, g.history.map((h) => h.round)]).toEqual([
      "GAME_OVER",
      null,
      [1, 2],
    ]);
  });

  it("rejects out-of-turn, foreign and taken moves", () => {
    let g = run(lobby(), { type: "start", by: "s1" });
    expect(err(apply(g, { type: "clue", seatId: "s2", text: "rosół" }))).toBe("NOT_YOUR_TURN");
    expect(err(apply(g, { type: "clue", seatId: "s1", text: "zielony" }))).toBe("COLOR_WORD");
    expect(err(apply(g, { type: "stone", seatId: "s4", x: 0, y: 0 }))).toBe("WRONG_PHASE");
    g = run(g, { type: "clue", seatId: "s1", text: "rosół" });
    expect(err(apply(g, { type: "stone", seatId: "s2", x: 0, y: 0 }))).toBe("NOT_YOUR_TURN");
    g = run(g, { type: "stone", seatId: "s4", x: 3, y: 3 });
    expect(err(apply(g, { type: "stone", seatId: "s2", x: 3, y: 3 }))).toBe("CELL_TAKEN");
    expect(err(apply(g, { type: "stone", seatId: "s2", x: 24, y: 0 }))).toBe("BAD_REQUEST");
    g = run(g, { type: "skip", seatId: "s2", reason: "timeout" });
    expect(g.phase).toBe("SECRET_2");
  });

  it("modes: ty → Grok is the only guesser; grok → Grok is the cue giver", () => {
    const ty = run(lobby({ mode: "ty" }), { type: "start", by: "s1" });
    expect(ty.current?.turnOrder).toEqual(["s4"]);
    const gm = run(lobby({ mode: "grok" }), { type: "start", by: "s1" });
    expect([gm.current?.cueGiverSeatId, actor(gm), gm.current?.turnOrder]).toEqual([
      "s4",
      "s4",
      ["s1", "s2"],
    ]);
  });

  it("pause blocks play and clears the actor; turnKey changes every turn", () => {
    let g = run(lobby(), { type: "start", by: "s1" });
    const k1 = turnKey(g);
    g = run(g, { type: "pause", paused: true, by: "s2" });
    expect(actor(g)).toBeNull();
    expect(err(apply(g, { type: "clue", seatId: "s1", text: "rosół" }))).toBe("PAUSED");
    g = run(
      g,
      { type: "pause", paused: false, by: "s2" },
      { type: "clue", seatId: "s1", text: "rosół" },
    );
    const k2 = turnKey(g);
    g = run(g, { type: "stone", seatId: "s4", x: 1, y: 1 });
    expect(new Set([k1, k2, turnKey(g)]).size).toBe(3);
  });

  it("ending mid-round drops the unrevealed target", () => {
    const g = run(lobby(), { type: "start", by: "s1" }, { type: "end", by: "s1" });
    expect([g.phase, g.current, g.history]).toEqual(["GAME_OVER", null, []]);
  });

  it("is pure and deterministic for a seed", () => {
    const g0 = lobby();
    const snap = JSON.stringify(g0);
    const a = run(g0, { type: "start", by: "s1" });
    expect(JSON.stringify(g0)).toBe(snap);
    expect(run(lobby(), { type: "start", by: "s1" }).current?.target).toEqual(a.current?.target);
    expect(a.rngSeed).not.toBe(g0.rngSeed);
  });
});

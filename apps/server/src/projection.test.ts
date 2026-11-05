import { type Action, apply, createGame, type GameState, turnSeat } from "@tint/game-core";
import { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { projectView } from "./projection";

/** Every state of a full 2-round online game: s1 host, s2 + s3 humans, s4 Grok. */
function allStates(mode: "stol" | "grok" = "stol"): GameState[] {
  const created = createGame(
    {
      mode,
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
    },
    "K7PQX",
    7,
  );
  if (!created.ok) throw new Error(created.message);
  let g = created.state;
  for (const s of g.seats) s.tokenHash = s.kind === "human" ? "h" : null;
  const states = [g];
  const step = (a: Action) => {
    const r = apply(g, a);
    if (!r.ok) throw new Error(`${a.type}: ${r.code}`);
    g = r.state;
    states.push(g);
  };
  step({ type: "start", by: "s1" });
  let x = 0;
  while (g.phase !== "GAME_OVER") {
    const r = g.current;
    if (!r) throw new Error("no round");
    if (g.phase === "REVEAL") step({ type: "next", by: "s2" });
    else if (g.phase === "SECRET_1")
      step({ type: "clue", seatId: r.cueGiverSeatId, text: "rosół" });
    else if (g.phase === "SECRET_2")
      step({ type: "clue", seatId: r.cueGiverSeatId, text: "z marchewką" });
    else step({ type: "stone", seatId: turnSeat(g) as string, x: x++ % 24, y: 5 });
  }
  return states;
}

const SEAT_SETS = [["s1"], ["s2"], ["s3"], ["s1", "s2", "s3"], []];

describe("projectView", () => {
  it.each(["stol", "grok"] as const)(
    "never leaks the target to a non-cue-giver before REVEAL (%s)",
    (mode) => {
      for (const g of allStates(mode)) {
        for (const seatIds of SEAT_SETS) {
          const view = PlayerView.parse(projectView(g, seatIds)); // shape matches the contract
          const isCue = view.cueGiverSeatId !== null && seatIds.includes(view.cueGiverSeatId);
          if (view.phase === "REVEAL") {
            expect(view.secret).toBeDefined();
            continue;
          }
          if (isCue && view.phase !== "LOBBY" && view.phase !== "GAME_OVER") {
            expect(view.secret?.target).toEqual(g.current?.target);
            continue;
          }
          // Not the cue giver: the current target must appear nowhere (history only holds past rounds).
          expect(view.secret).toBeUndefined();
          expect(view.reveal).toBeUndefined();
          expect(JSON.stringify({ ...view, history: [] })).not.toContain("target");
        }
      }
    },
  );

  it("never exposes server-only fields", () => {
    for (const g of allStates()) {
      const json = JSON.stringify(projectView(g, ["s1"]));
      for (const f of ["tokenHash", "rngSeed", "turnOrder", "createdAt"])
        expect(json).not.toContain(f);
    }
  });

  it("Grok mode: no human connection sees Grok's secret before REVEAL", () => {
    const g = allStates("grok").find((s) => s.phase === "GUESS_1");
    expect(g && projectView(g, ["s1", "s2", "s3"]).secret).toBeUndefined();
  });
});

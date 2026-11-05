import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { Invariants } from "./invariants";

const seats = (["s1", "s2", "s3"] as const).map((id, i) => ({
  id,
  name: id,
  kind: i === 2 ? ("grok" as const) : ("human" as const),
  platform: "web" as const,
  score: 0,
  connected: true,
}));
const view = (o: Partial<PlayerView>): PlayerView => ({
  v: 1,
  roomCode: "ABCDE",
  mode: "stol",
  local: false,
  phase: "SECRET_1",
  round: 1,
  totalRounds: 1,
  paused: false,
  hostSeatId: "s1",
  seats,
  you: ["s2"],
  cueGiverSeatId: "s1",
  turnSeatId: null,
  turnDeadline: null,
  clues: [],
  stones: [],
  history: [],
  ...o,
});
const feed = (inv: Invariants, ...vs: PlayerView[]) => {
  for (const [i, v] of vs.entries()) inv.onMessage({ type: "view", seq: i, view: v });
};

describe("Invariants", () => {
  it("passes a legal opening", () => {
    const inv = new Invariants("t");
    feed(
      inv,
      view({}),
      view({ phase: "GUESS_1", clues: ["rosół"], turnSeatId: "s3" }),
      view({
        phase: "GUESS_1",
        clues: ["rosół"],
        turnSeatId: "s2",
        stones: [{ seatId: "s3", x: 1, y: 1, n: 1 }],
      }),
    );
    expect(inv.violations).toEqual([]);
    expect(inv.stats.grokFirstChecked).toBe(1);
  });

  it("flags a leaked secret, a skipped phase, a non-Grok first mover and a repeated seq", () => {
    const inv = new Invariants("t");
    const secret = {
      target: { x: 3, y: 3 },
      window: { x0: 0, y0: 0, w: 7 as const, h: 9 as const },
    };
    feed(inv, view({ secret }), view({ phase: "SECRET_2" }));
    inv.onMessage({ type: "view", seq: 1, view: view({ phase: "SECRET_2" }) });
    const text = inv.violations.join("\n");
    expect(text).toContain("secret leaked");
    expect(text).toContain("illegal phase step SECRET_1 → SECRET_2");
    expect(text).toContain("seq went");
  });

  it("flags a color word in a Grok line and a missing GAME_OVER", () => {
    const inv = new Invariants("t");
    inv.onMessage({ type: "bot.say", seatId: "s3", text: "Takie czerwone." });
    expect(inv.violations[0]).toContain("names a color");
    expect(inv.finish().join()).toContain("never reached GAME_OVER");
  });
});

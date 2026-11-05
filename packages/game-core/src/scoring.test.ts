import { readFileSync } from "node:fs";
import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { awardsFor, scoreStone } from "./scoring";
import { viewfinderWindow } from "./viewfinder";

const fixture = (name: string): PlayerView =>
  JSON.parse(
    readFileSync(new URL(`../../../shared/fixtures/views/${name}`, import.meta.url), "utf8"),
  );

describe("viewfinderWindow", () => {
  it.each([
    [
      { x: 10, y: 6 },
      { x0: 7, y0: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x0: 0, y0: 0 },
    ],
    [
      { x: 23, y: 0 },
      { x0: 17, y0: 0 },
    ],
    [
      { x: 0, y: 11 },
      { x0: 0, y0: 3 },
    ],
    [
      { x: 23, y: 11 },
      { x0: 17, y0: 3 },
    ],
  ])("%o → %o", (t, w) => expect(viewfinderWindow(t)).toEqual({ ...w, w: 7, h: 9 }));
});

describe("scoring", () => {
  it("3/2/1 by Chebyshev distance, nothing beyond 5 × 5", () => {
    const t = { x: 5, y: 5 };
    expect(scoreStone(t, { x: 5, y: 5 })).toEqual({ delta: 3, reason: "exact" });
    expect(scoreStone(t, { x: 6, y: 4 })).toEqual({ delta: 2, reason: "near" });
    expect(scoreStone(t, { x: 3, y: 7 })).toEqual({ delta: 1, reason: "far" });
    expect(scoreStone(t, { x: 8, y: 5 })).toBeNull();
  });

  it("reproduces the reveal.json fixture awards", () => {
    const { reveal, stones, cueGiverSeatId, seats } = fixture("reveal.json");
    if (!reveal || !cueGiverSeatId) throw new Error("fixture must be a REVEAL view");
    const awards = awardsFor(
      { target: reveal.target, stones, cueGiverSeatId },
      seats.map((s) => s.id),
    );
    expect(awards).toEqual(reveal.awards);
  });
});

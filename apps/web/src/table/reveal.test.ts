import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { fixture } from "../dev/fixtures";
import { deltasLine, stoneBadges } from "./reveal";

describe("reveal helpers", () => {
  const view = fixture("reveal");

  it("pins each stone award to the stone in that zone", () => {
    // target (4,4); stones: Grok (6,6) far, Ola (2,2) far, Grok (5,3) near, Ola (4,4) exact
    const badges = stoneBadges(view);
    expect([...badges.entries()].sort()).toEqual([
      [0, "+1"],
      [1, "+1"],
      [2, "+2"],
      [3, "+3"],
    ]);
  });

  it("gives no badges before the reveal", () => {
    expect(stoneBadges(fixture("guess2")).size).toBe(0);
  });

  it("ignores awards that match no stone (house points stay in the deltas line)", () => {
    const v: PlayerView = {
      ...view,
      reveal: view.reveal && {
        ...view.reveal,
        awards: [{ seatId: "s3", delta: 3, reason: "exact" }],
      },
    };
    expect(stoneBadges(v).size).toBe(0);
  });

  it("formats the round deltas in score order", () => {
    expect(deltasLine(view)).toBe("Ola +4 · Grok +3 · Kuba +2");
  });
});

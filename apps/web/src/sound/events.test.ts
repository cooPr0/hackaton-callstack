import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { fixture } from "../dev/fixtures";
import { soundEventsFor } from "./events";

const with_ = (v: PlayerView, patch: Partial<PlayerView>): PlayerView => ({ ...v, ...patch });

describe("soundEventsFor", () => {
  it("is silent on the first view", () => {
    expect(soundEventsFor(null, fixture("guess1"))).toEqual([]);
  });

  it("writes the clue and plays Grok's stone when the table opens", () => {
    const before = fixture("secret1-guesser");
    const after = fixture("guess1"); // clue "Rosół", Grok's stone, Ola's turn (this device = Ola)
    expect(soundEventsFor(before, after)).toEqual(["clue.write", "stone.grok", "turn.yours"]);
  });

  it("distinguishes human stones and does not repeat turn.yours", () => {
    const a = fixture("guess1");
    const b = with_(a, { stones: [...a.stones, { seatId: "s2", x: 2, y: 2, n: 1 }] });
    expect(soundEventsFor(a, b)).toEqual(["stone.place"]);
  });

  it("plays the reveal swell and one chime per award (house bonus excluded)", () => {
    expect(soundEventsFor(fixture("guess2"), fixture("reveal"))).toEqual([
      "stone.place",
      "reveal",
      "score.far",
      "score.exact",
      "score.far",
      "score.near",
    ]);
  });

  it("ends the round and the game", () => {
    const reveal = fixture("reveal");
    expect(soundEventsFor(reveal, with_(fixture("secret1-guesser"), { round: 4 }))).toEqual([
      "round.end",
    ]);
    expect(soundEventsFor(reveal, fixture("gameover"))).toEqual(["game.win"]);
  });
});

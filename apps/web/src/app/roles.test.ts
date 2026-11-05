import { describe, expect, it } from "vitest";
import { secretLeak } from "../../../../packages/protocol/scripts/fixtures";
import { fixture, viewFixtures } from "../dev/fixtures";
import { publicView, viewForScreen } from "./publicView";
import {
  cueGiverIsGrok,
  cueGiverName,
  isCueGiver,
  isHost,
  isMyTurn,
  roundDeltas,
  stonesHome,
  stonesInWindow,
  turnName,
} from "./roles";

describe("roles", () => {
  it("knows who is who in guess1 (Ola's turn, Kuba gives the clue)", () => {
    const v = fixture("guess1");
    expect(isCueGiver(v)).toBe(false);
    expect(isMyTurn(v)).toBe(true);
    expect(cueGiverName(v)).toBe("Kuba");
    expect(turnName(v)).toBe("Ola");
    expect(isHost(v)).toBe(false);
  });

  it("detects the cue giver and Grok as cue giver", () => {
    expect(isCueGiver(fixture("secret1-cuegiver"))).toBe(true);
    expect(cueGiverIsGrok(fixture("grok-secret1"))).toBe(true);
    expect(cueGiverIsGrok(fixture("secret1-guesser"))).toBe(false);
  });

  it("sums round deltas and house stones from awards", () => {
    const v = fixture("reveal");
    expect(roundDeltas(v)).toEqual({ s1: 2, s2: 4, s3: 3 });
    expect(stonesHome(v)).toBe(2);
  });

  it("finds stones inside the viewfinder", () => {
    expect(stonesInWindow(fixture("secret2-cuegiver"))).toHaveLength(2);
    expect(stonesInWindow(fixture("secret1-guesser"))).toHaveLength(0);
  });
});

describe("publicView (privacy)", () => {
  it.each(Object.keys(viewFixtures))("%s: never exposes the secret before REVEAL", (name) => {
    const pub = publicView(fixture(name));
    if (pub.phase !== "REVEAL" && pub.phase !== "GAME_OVER") expect(pub.secret).toBeUndefined();
    expect(secretLeak(pub)).toBe(false);
  });

  it("strips the secret from the local device's table view", () => {
    const local = fixture("local-guess1");
    expect(local.secret).toBeDefined();
    expect(viewForScreen(local, "table")?.secret).toBeUndefined();
    expect(viewForScreen(local, "secret")?.secret).toBeDefined();
  });

  it("keeps the secret in REVEAL", () => {
    expect(publicView(fixture("reveal")).secret).toBeDefined();
  });
});

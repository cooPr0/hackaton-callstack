import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { fixture } from "../dev/fixtures";
import { selectScreen } from "./selectScreen";
import type { Posture, ScreenId } from "./types";

const locked = { secretUnlockedFor: null };
const asLocal = (v: PlayerView, you = ["s1", "s2"]): PlayerView => ({ ...v, local: true, you });

describe("selectScreen — online fixtures", () => {
  const cases: [string, Posture, ScreenId][] = [
    ["lobby", "open", "lobby"],
    ["lobby", "closed", "lobby"],
    ["secret1-cuegiver", "closed", "secret"],
    ["secret1-cuegiver", "open", "secret"],
    ["secret1-guesser", "open", "table"],
    ["secret1-guesser", "closed", "table"],
    ["guess1", "open", "table"],
    ["guess1", "closed", "table"],
    ["secret2-cuegiver", "open", "secret"],
    ["guess2", "open", "table"],
    ["reveal", "open", "table"],
    ["reveal", "closed", "table"],
    ["gameover", "open", "game-over"],
    ["grok-secret1", "closed", "grok-secret"],
    ["grok-secret1", "open", "table"],
  ];
  it.each(cases)("%s (%s) → %s", (name, posture, expected) => {
    expect(selectScreen(fixture(name), posture, locked)).toBe(expected);
  });

  it("no view → connecting", () => {
    expect(selectScreen(null, "open", locked)).toBe("connecting");
  });
});

describe("selectScreen — local pass-and-play", () => {
  it("GUESS: open shows the table, closed asks to unfold", () => {
    expect(selectScreen(fixture("local-guess1"), "open", locked)).toBe("table");
    expect(selectScreen(fixture("local-guess1"), "closed", locked)).toBe("handoff-unfold");
  });

  it("SECRET: open asks to fold; closed gates on 'Jestem Kuba' before showing the secret", () => {
    const v = asLocal(fixture("secret1-cuegiver"));
    expect(selectScreen(v, "open", locked)).toBe("handoff-fold");
    expect(selectScreen(v, "closed", locked)).toBe("pass");
    expect(selectScreen(v, "closed", { secretUnlockedFor: "s2" })).toBe("pass");
    expect(selectScreen(v, "closed", { secretUnlockedFor: "s1" })).toBe("secret");
    // unlocking never shows the secret while the phone is open
    expect(selectScreen(v, "open", { secretUnlockedFor: "s1" })).toBe("handoff-fold");
  });

  it("SECRET with Grok as cue giver: card when closed, waiting table when open", () => {
    const v = asLocal(fixture("grok-secret1"));
    expect(selectScreen(v, "closed", locked)).toBe("grok-secret");
    expect(selectScreen(v, "open", locked)).toBe("table");
  });

  it("REVEAL: open shows the table, closed shows the round card", () => {
    const v = asLocal(fixture("reveal"));
    expect(selectScreen(v, "open", locked)).toBe("table");
    expect(selectScreen(v, "closed", locked)).toBe("round-card");
  });
});

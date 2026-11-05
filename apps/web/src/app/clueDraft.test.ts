import type { PlayerView } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { fixture } from "../dev/fixtures";
import { draftToSendOnUnfold } from "./clueDraft";

const local = (v: PlayerView): PlayerView => ({
  ...v,
  local: true,
  you: v.seats.filter((s) => s.kind === "human").map((s) => s.id),
});

describe("draftToSendOnUnfold", () => {
  const secret = local(fixture("secret1-cuegiver"));
  const cue = secret.cueGiverSeatId as string;
  const ui = { clueDraft: "  Rosół ", secretUnlockedFor: cue };

  it("sends the trimmed draft when the cue giver unfolds", () => {
    expect(draftToSendOnUnfold("closed", "open", secret, ui)).toBe("Rosół");
  });

  it("ignores anything that is not a closed → open transition", () => {
    expect(draftToSendOnUnfold("open", "open", secret, ui)).toBeNull();
    expect(draftToSendOnUnfold(null, "open", secret, ui)).toBeNull();
    expect(draftToSendOnUnfold("open", "closed", secret, ui)).toBeNull();
  });

  it("needs a local SECRET phase", () => {
    expect(draftToSendOnUnfold("closed", "open", fixture("secret1-cuegiver"), ui)).toBeNull();
    expect(draftToSendOnUnfold("closed", "open", local(fixture("guess1")), ui)).toBeNull();
  });

  it("needs the phone unlocked by the cue giver and a non-empty draft", () => {
    expect(
      draftToSendOnUnfold("closed", "open", secret, { ...ui, secretUnlockedFor: null }),
    ).toBeNull();
    expect(draftToSendOnUnfold("closed", "open", secret, { ...ui, clueDraft: "   " })).toBeNull();
  });
});

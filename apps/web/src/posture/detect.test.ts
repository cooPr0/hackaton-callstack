import { describe, expect, it } from "vitest";
import { resolvePosture } from "./detect";

describe("resolvePosture", () => {
  it("override wins", () => {
    expect(resolvePosture({ override: "closed", segments: true, wideLandscape: true })).toEqual({
      posture: "closed",
      source: "override",
    });
  });
  it("two viewport segments = open", () => {
    expect(resolvePosture({ override: null, segments: true, wideLandscape: false }).posture).toBe(
      "open",
    );
  });
  it("falls back to window shape", () => {
    expect(resolvePosture({ override: null, segments: false, wideLandscape: true }).posture).toBe(
      "open",
    );
    expect(resolvePosture({ override: null, segments: false, wideLandscape: false }).posture).toBe(
      "closed",
    );
  });
});

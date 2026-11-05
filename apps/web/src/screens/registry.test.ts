import { describe, expect, it } from "vitest";
import { SCREEN_IDS } from "../app/types";
import { registry } from "./registry";

describe("screen registry", () => {
  it("has a component for every ScreenId", () => {
    for (const id of SCREEN_IDS) expect(typeof registry[id]).toBe("function");
    expect(Object.keys(registry).sort()).toEqual([...SCREEN_IDS].sort());
  });
});

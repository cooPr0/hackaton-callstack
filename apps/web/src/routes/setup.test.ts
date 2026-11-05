import { describe, expect, it } from "vitest";
import { clampRounds, firstCueGiver, normalizePlayers, toForm, validate } from "./setup";

describe("setup helpers", () => {
  it("keeps humans in order, fills blank names and appends one Grok", () => {
    expect(
      normalizePlayers([
        { name: "Grok", kind: "grok" },
        { name: " Ola ", kind: "human" },
        { name: "", kind: "human" },
      ]),
    ).toEqual([
      { name: "Ola", kind: "human" },
      { name: "Gracz 2", kind: "human" },
      { name: "Grok", kind: "grok" },
    ]);
  });

  it("names the first cue giver per mode", () => {
    const p = [
      { name: "Kuba", kind: "human" as const },
      { name: "Ola", kind: "human" as const },
    ];
    expect(firstCueGiver("stol", p)).toBe("Kuba");
    expect(firstCueGiver("grok", p)).toBe("Grok");
  });

  it("validates player counts per mode", () => {
    expect(validate("stol", [{ name: "Kuba", kind: "human" }])).toMatch(/dwóch/);
    expect(validate("ty", [{ name: "Kuba", kind: "human" }])).toBeNull();
    expect(validate("grok", [])).toMatch(/co najmniej jeden/);
  });

  it("builds a protocol-ready form", () => {
    expect(clampRounds(40)).toBe(12);
    expect(
      toForm("stol", 6, true, [
        { name: "Kuba", kind: "human" },
        { name: "Ola", kind: "human" },
      ]),
    ).toEqual({
      mode: "stol",
      rounds: 6,
      local: true,
      hostName: "Kuba",
      players: [
        { name: "Kuba", kind: "human" },
        { name: "Ola", kind: "human" },
        { name: "Grok", kind: "grok" },
      ],
    });
  });
});

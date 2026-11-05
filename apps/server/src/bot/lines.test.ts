import { describe, expect, it } from "vitest";
import { type Line, MAX_LINES, remember } from "./lines";

describe("remember", () => {
  it("gives every line a distinct 128-bit hex id", () => {
    const lines: Line[] = [];
    const a = remember(lines, "Biorę kratkę głębiej.", "pl");
    const b = remember(lines, "One tile deeper.", "en");
    expect(a.id).toMatch(/^[a-f0-9]{32}$/);
    expect(a.id).not.toBe(b.id);
    expect(lines.map((l) => l.lang)).toEqual(["pl", "en"]);
  });

  it("keeps only the newest lines", () => {
    const lines: Line[] = [];
    for (let i = 0; i < MAX_LINES + 5; i++) remember(lines, `line ${i}`, "pl");
    expect(lines).toHaveLength(MAX_LINES);
    expect(lines[0]?.text).toBe("line 5");
  });
});

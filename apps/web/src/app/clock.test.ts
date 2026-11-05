import { describe, expect, it } from "vitest";
import { formatClock, remainingSeconds } from "./clock";

describe("turn clock", () => {
  it("counts down to the deadline and clamps at zero", () => {
    expect(remainingSeconds(null, 0)).toBeNull();
    expect(remainingSeconds(90_000, 0)).toBe(90);
    expect(remainingSeconds(1_500, 0)).toBe(2);
    expect(remainingSeconds(0, 1_000)).toBe(0);
  });

  it("formats minutes and seconds", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(0)).toBe("0:00");
  });
});

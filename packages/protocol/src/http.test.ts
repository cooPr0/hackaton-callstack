import { describe, expect, it } from "vitest";
import { wsPath } from "./http";

describe("wsPath", () => {
  it("repeats token once per seat and keeps pv last", () => {
    expect(wsPath("K7PQX", "a")).toBe("/api/rooms/K7PQX/ws?token=a&pv=1");
    expect(wsPath("K7PQX", ["a", "b"])).toBe("/api/rooms/K7PQX/ws?token=a&token=b&pv=1");
  });
});

import { describe, expect, it } from "vitest";
import { createTokenStore, type KeyValue } from "./tokens";

const mapStorage = (): KeyValue => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};

const room = {
  seats: [{ seatId: "s1", token: "tok_0123456789abcdef" }],
  local: false,
  createdAt: 1,
};

describe("token store", () => {
  it("saves and loads per room code (case-insensitive)", () => {
    const t = createTokenStore(mapStorage());
    t.save("k7pqx", room);
    expect(t.load("K7PQX")).toEqual(room);
    expect(t.load("AAAAA")).toBeNull();
  });

  it("survives a storage that throws", () => {
    const broken: KeyValue = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const t = createTokenStore(broken);
    t.save("K7PQX", room);
    expect(t.load("K7PQX")).toEqual(room);
    t.forget("K7PQX");
    expect(t.load("K7PQX")).toBeNull();
  });

  it("ignores corrupt entries", () => {
    const s = mapStorage();
    s.setItem("tint:room:K7PQX", "{not json");
    expect(createTokenStore(s).load("K7PQX")).toBeNull();
  });
});

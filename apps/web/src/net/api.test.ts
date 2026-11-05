import { describe, expect, it, vi } from "vitest";
import { wsUrl } from "../app/config";
import { createApi } from "./api";
import { ApiError } from "./errors";

const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );

describe("api", () => {
  it("creates a room and validates the response", async () => {
    const f = vi.fn(() =>
      json(200, { code: "K7PQX", seats: [{ seatId: "s1", token: "tok_0123456789abcdef" }] }),
    );
    const api = createApi("http://x", f as unknown as typeof fetch);
    const res = await api.createRoom({
      mode: "stol",
      local: false,
      platform: "web",
      seats: [
        { name: "Ola", kind: "human" },
        { name: "Grok", kind: "grok" },
      ],
    });
    expect(res.code).toBe("K7PQX");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://x/api/rooms");
    expect(init.method).toBe("POST");
  });

  it("maps HTTP errors to protocol codes with Polish messages", async () => {
    const api = createApi("http://x", (() =>
      json(409, { code: "ROOM_FULL", message: "full" })) as unknown as typeof fetch);
    await expect(api.joinRoom("K7PQX", { name: "Ola", platform: "web" })).rejects.toMatchObject({
      code: "ROOM_FULL",
      status: 409,
      message: "Pokój jest pełny.",
    });
  });

  it("maps network failures to NETWORK", async () => {
    const api = createApi("http://x", (() =>
      Promise.reject(new TypeError("offline"))) as unknown as typeof fetch);
    const err = await api.health().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("NETWORK");
  });

  it("rejects malformed responses", async () => {
    const api = createApi("http://x", (() => json(200, { ok: "yes" })) as unknown as typeof fetch);
    await expect(api.health()).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });
});

describe("wsUrl", () => {
  it("switches scheme and appends one token param per seat", () => {
    expect(wsUrl("https://api.example.dev", "K7PQX", ["a", "b"])).toBe(
      "wss://api.example.dev/api/rooms/K7PQX/ws?token=a&token=b&pv=1",
    );
    expect(wsUrl("http://localhost:8787", "K7PQX", ["a"])).toBe(
      "ws://localhost:8787/api/rooms/K7PQX/ws?token=a&pv=1",
    );
  });
});

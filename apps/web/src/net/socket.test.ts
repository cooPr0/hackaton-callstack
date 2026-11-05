import type { ServerMessage } from "@tint/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnState } from "../app/types";
import { fixture } from "../dev/fixtures";
import { fakeFactory } from "./fakeSocket";
import { backoffMs, RoomSocket } from "./socket";

function setup() {
  const f = fakeFactory();
  const messages: ServerMessage[] = [];
  const states: ConnState[] = [];
  let n = 0;
  const sock = new RoomSocket({
    url: "ws://x/api/rooms/K7PQX/ws?token=t&pv=1",
    hello: { platform: "web", name: "Ola" },
    onMessage: (m) => messages.push(m),
    onStatus: (s) => states.push(s),
    createSocket: f.create,
    random: () => 0.5,
    newCid: () => `c${++n}`,
  });
  return { f, sock, messages, states };
}

const view = (seq: number) => ({ type: "view", seq, view: fixture("guess1") });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("RoomSocket", () => {
  it("sends hello on open and reports status", () => {
    const { f, sock, states } = setup();
    sock.connect();
    f.current().open();
    expect(states).toEqual(["connecting", "open"]);
    expect(f.current().sent[0]).toMatchObject({
      type: "hello",
      pv: 1,
      platform: "web",
      name: "Ola",
    });
  });

  it("resolves on ack and rejects on error by cid", async () => {
    const { f, sock } = setup();
    sock.connect();
    f.current().open();
    const ok = sock.send({ type: "round.next" });
    const cidOk = f.current().last("round.next")?.cid;
    f.current().receive({ type: "ack", cid: cidOk });
    await expect(ok).resolves.toBeUndefined();

    const bad = sock.send({ type: "stone.place", seatId: "s2", x: 2, y: 2 });
    const cidBad = f.current().last("stone.place")?.cid;
    f.current().receive({ type: "error", cid: cidBad, code: "CELL_TAKEN", message: "x" });
    await expect(bad).rejects.toMatchObject({
      code: "CELL_TAKEN",
      message: "Ta kratka jest zajęta.",
    });
  });

  it("times out unanswered requests", async () => {
    const { f, sock } = setup();
    sock.connect();
    f.current().open();
    const p = sock.send({ type: "game.start" });
    vi.advanceTimersByTime(5_001);
    await expect(p).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("rejects sends while disconnected", async () => {
    const { sock } = setup();
    await expect(sock.send({ type: "game.start" })).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("drops stale view snapshots and resets after welcome", () => {
    const { f, sock, messages } = setup();
    sock.connect();
    f.current().open();
    f.current().receive(view(5));
    f.current().receive(view(4));
    f.current().receive(view(5));
    f.current().receive(view(6));
    expect(
      messages.filter((m) => m.type === "view").map((m) => (m.type === "view" ? m.seq : -1)),
    ).toEqual([5, 6]);
    f.current().receive({ type: "welcome", seatIds: ["s2"], serverTime: 1, protocol: 1 });
    f.current().receive(view(1));
    expect(messages.at(-1)).toMatchObject({ type: "view", seq: 1 });
  });

  it("ignores frames that do not match the protocol", () => {
    const { f, sock, messages } = setup();
    sock.connect();
    f.current().open();
    f.current().receive({ type: "view", seq: "nope" });
    f.current().onmessage?.({ data: "not json" });
    expect(messages).toHaveLength(0);
  });

  it("pings while open", () => {
    const { f, sock } = setup();
    sock.connect();
    f.current().open();
    vi.advanceTimersByTime(20_000);
    expect(f.current().last("ping")).toBeDefined();
  });

  it("reconnects with backoff and sends hello again", () => {
    const { f, sock, states } = setup();
    sock.connect();
    f.current().open();
    const pending = sock.send({ type: "game.start" });
    f.current().drop();
    expect(states.at(-1)).toBe("reconnecting");
    vi.advanceTimersByTime(backoffMs(1, () => 0.5));
    expect(f.sockets).toHaveLength(2);
    f.current().open();
    expect(f.current().sent[0]).toMatchObject({ type: "hello" });
    return expect(pending).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("gives up after too many failed attempts", () => {
    const { f, sock, states } = setup();
    sock.connect();
    for (let i = 1; i <= 10; i++) {
      f.current().drop();
      vi.advanceTimersByTime(8_000 * 1.2);
    }
    f.current().drop();
    expect(states.at(-1)).toBe("failed");
  });

  it("treats 4401/4426 as fatal and close() as final", () => {
    const a = setup();
    a.sock.connect();
    a.f.current().open();
    a.f.current().drop(4401);
    expect(a.states.at(-1)).toBe("failed");

    const b = setup();
    b.sock.connect();
    b.f.current().open();
    b.sock.close();
    vi.advanceTimersByTime(60_000);
    expect(b.f.sockets).toHaveLength(1);
    expect(b.states.at(-1)).toBe("closed");
  });
});

describe("backoffMs", () => {
  it("doubles from 0.5 s and caps at 8 s with ±20 % jitter", () => {
    const mid = () => 0.5;
    expect([1, 2, 3, 4, 5, 6, 9].map((n) => backoffMs(n, mid))).toEqual([
      500, 1000, 2000, 4000, 8000, 8000, 8000,
    ]);
    expect(backoffMs(1, () => 0)).toBe(400);
    expect(backoffMs(1, () => 1)).toBe(600);
  });
});

import type { ServerMessage } from "@tint/protocol";
import { describe, expect, it, vi } from "vitest";
import { fixture } from "../dev/fixtures";
import type { Api } from "../net/api";
import { ApiError } from "../net/errors";
import type { Outgoing, RoomConnection } from "../net/socket";
import { type ConnectHandlers, createGameStore } from "./game";
import { createTokenStore } from "./tokens";

function setup(sendImpl: (m: Outgoing) => Promise<void> = async () => {}) {
  const sent: Outgoing[] = [];
  let handlers: ConnectHandlers | null = null;
  let openedWith: { code: string; tokens: string[] } | null = null;
  const conn: RoomConnection = {
    connect: vi.fn(),
    close: vi.fn(),
    retry: vi.fn(),
    send: (m) => {
      sent.push(m);
      return sendImpl(m);
    },
  };
  const api = {
    health: vi.fn(),
    createRoom: vi.fn(async () => ({
      code: "K7PQX",
      seats: [
        { seatId: "s1", token: "tok_s1_0123456789ab" },
        { seatId: "s2", token: "tok_s2_0123456789ab" },
      ],
    })),
    joinRoom: vi.fn(async () => ({ seatId: "s2", token: "tok_s2_0123456789ab" })),
  } as unknown as Api;
  const tokens = createTokenStore(null);
  const setPostureOverride = vi.fn();
  const store = createGameStore({
    api,
    tokens,
    setPostureOverride,
    now: () => 1000,
    openConnection: (code, toks, h) => {
      handlers = h;
      openedWith = { code, tokens: toks };
      return conn;
    },
  });
  const push = (m: ServerMessage) => handlers?.onMessage(m);
  return {
    store,
    sent,
    conn,
    api,
    push,
    opened: () => openedWith,
    handlers: () => handlers,
    setPostureOverride,
  };
}

const viewMsg = (name: string, seq = 1): ServerMessage => ({
  type: "view",
  seq,
  view: fixture(name),
});

describe("game store", () => {
  it("creates a local room, stores every seat token and connects with all of them", async () => {
    const { store, api, opened } = setup();
    const code = await store.getState().createRoom({
      mode: "stol",
      rounds: 6,
      local: true,
      hostName: "Kuba",
      lang: "en",
      players: [
        { name: "Kuba", kind: "human" },
        { name: "Ola", kind: "human" },
        { name: "Grok", kind: "grok" },
      ],
    });
    expect(code).toBe("K7PQX");
    expect(api.createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ local: true, platform: "web", lang: "en" }),
    );
    store.getState().connect(code);
    expect(opened()).toEqual({
      code: "K7PQX",
      tokens: ["tok_s1_0123456789ab", "tok_s2_0123456789ab"],
    });
    expect(store.getState().local).toBe(true);
  });

  it("fails fast when this browser holds no seat for the room", () => {
    const { store } = setup();
    store.getState().connect("ZZZZZ");
    expect(store.getState().conn).toBe("failed");
    expect(store.getState().error?.code).toBe("NO_SEAT");
  });

  it("places a stone as the turn seat and submits clues as the cue giver", async () => {
    const { store, sent, push } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push(viewMsg("guess1"));
    await store.getState().actions.place(2, 2);
    expect(sent.at(-1)).toEqual({ type: "stone.place", seatId: "s2", x: 2, y: 2 });

    push(viewMsg("secret1-cuegiver", 2));
    await store.getState().actions.submitClue("  Rosół ");
    expect(sent.at(-1)).toEqual({ type: "clue.submit", seatId: "s1", text: "Rosół" });
  });

  it("refuses to act for a seat this device does not hold", async () => {
    const { store, sent, push } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push(viewMsg("secret1-guesser"));
    await expect(store.getState().actions.submitClue("Rosół")).rejects.toMatchObject({
      code: "NOT_YOUR_SEAT",
    });
    expect(sent).toHaveLength(0);
    expect(store.getState().error?.message).toBe("To nie Twoje miejsce.");
  });

  it("surfaces server rejections as a Polish toast and tracks pending", async () => {
    let release: () => void = () => {};
    const { store, push } = setup(
      (m) =>
        new Promise((res, rej) => {
          if (m.type === "stone.place") rej(new ApiError("CELL_TAKEN", "Ta kratka jest zajęta."));
          else release = res;
        }),
    );
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push(viewMsg("guess1"));
    await expect(store.getState().actions.place(6, 6)).rejects.toMatchObject({
      code: "CELL_TAKEN",
    });
    expect(store.getState().error?.message).toBe("Ta kratka jest zajęta.");

    const p = store.getState().actions.next();
    expect(store.getState().pendingCount).toBe(1);
    release();
    await p;
    expect(store.getState().pendingCount).toBe(0);
  });

  it("re-locks the local secret when the round or cue giver changes", async () => {
    const { store, push } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push(viewMsg("secret1-cuegiver"));
    store.getState().actions.unlockSecret("s1");
    push(viewMsg("secret2-cuegiver", 2)); // same round + cue giver → stays unlocked
    expect(store.getState().ui.secretUnlockedFor).toBe("s1");
    push({
      type: "view",
      seq: 3,
      view: { ...fixture("secret1-cuegiver"), round: 4, cueGiverSeatId: "s2" },
    });
    expect(store.getState().ui.secretUnlockedFor).toBeNull();
  });

  it("keeps the clue draft within one phase and clears it on the next", async () => {
    const { store, push } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push(viewMsg("secret1-cuegiver"));
    store.getState().actions.setClueDraft("Rosó");
    push({ type: "view", seq: 2, view: { ...fixture("secret1-cuegiver"), paused: true } });
    expect(store.getState().ui.clueDraft).toBe("Rosó"); // same phase → kept
    push(viewMsg("guess1", 3));
    expect(store.getState().ui.clueDraft).toBe("");
  });

  it("tracks Grok's thinking and lines", async () => {
    const { store, push } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    push({ type: "bot.status", seatId: "s3", state: "thinking" });
    expect(store.getState().bot.thinking).toBe(true);
    push({ type: "bot.say", seatId: "s3", text: "Złoty, ale nie z puszki." });
    expect(store.getState().bot).toEqual({
      thinking: false,
      line: "Złoty, ale nie z puszki.",
      lineAt: 1000,
      audioUrl: null,
    });
    const audioUrl = "/api/rooms/K7PQX/say/0123456789abcdef0123456789abcdef.mp3";
    push({ type: "bot.say", seatId: "s3", text: "Teraz na głos.", audioUrl });
    expect(store.getState().bot.audioUrl).toBe(audioUrl);
    push({ type: "bot.say", seatId: "s3", text: "A teraz bez." });
    expect(store.getState().bot.audioUrl).toBeNull();
  });

  it("follows status and delegates posture + leave", async () => {
    const { store, handlers, conn, setPostureOverride } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    handlers()?.onStatus("open");
    expect(store.getState().conn).toBe("open");
    store.getState().actions.setPosture("closed");
    expect(setPostureOverride).toHaveBeenCalledWith("closed");
    store.getState().actions.leave();
    expect(conn.close).toHaveBeenCalled();
    expect(store.getState().view).toBeNull();
  });
});

describe("game store — fatal closes", () => {
  it("forgets a dead seat and surfaces a translated error", async () => {
    const { store, handlers } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    handlers()?.onStatus("failed");
    handlers()?.onFatal(4401);
    expect(store.getState().error?.code).toBe("BAD_TOKEN");
    store.getState().connect("K7PQX");
    expect(store.getState().error?.code).toBe("NO_SEAT"); // token was forgotten
  });

  it("explains a takeover by another tab without forgetting the seat", async () => {
    const { store, handlers } = setup();
    await store.getState().joinRoom("K7PQX", "Ola");
    store.getState().connect("K7PQX");
    handlers()?.onFatal(4409);
    expect(store.getState().error?.message).toMatch(/innej karcie/);
    store.getState().connect("K7PQX");
    expect(store.getState().error).toBeNull();
  });
});

import { test } from "@e2e-dev/web";
import { expect } from "e2e";

/** Game Worker. The web build points here via apps/web/.env.production. */
const SERVER = "https://tint-server.tint-server.workers.dev";

interface Created {
  code: string;
  seats: { seatId: string; token: string }[];
}

interface Frame {
  type: string;
  seatIds?: string[];
  view?: { phase?: string; roomCode?: string; you?: string[] };
}

async function createRoom(): Promise<Created> {
  const res = await fetch(`${SERVER}/api/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: "stol",
      local: false,
      platform: "web",
      rounds: 1,
      seats: [
        { name: "Kuba", kind: "human" },
        { name: "Ola", kind: "human" },
        { name: "Grok", kind: "grok" },
      ],
    }),
  });
  const body = (await res.json()) as Created & { code?: string; message?: string };
  expect(res.ok, body.message ?? res.statusText).toBe(true);
  return body;
}

/** Open the seat socket, say hello, and collect frames until the first view. */
function connect(code: string, token: string) {
  const ws = new WebSocket(
    `${SERVER.replace(/^http/, "ws")}/api/rooms/${code}/ws?token=${encodeURIComponent(token)}&pv=1`,
  );
  const frames: Frame[] = [];
  const untilView = new Promise<Frame[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`no view; saw ${frames.map((f) => f.type).join(", ") || "nothing"}`));
    }, 10_000);
    ws.addEventListener("message", (ev) => {
      const frame = JSON.parse(String(ev.data)) as Frame;
      frames.push(frame);
      if (frame.type !== "view") return;
      clearTimeout(timer);
      resolve(frames);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("websocket error"));
    });
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket failed to open")), {
      once: true,
    });
  });
  return { ws, opened, untilView };
}

test("the host socket receives welcome and the lobby view", async () => {
  const room = await createRoom();
  const host = room.seats[0];
  expect(host).toBeDefined();
  const { ws, opened, untilView } = connect(room.code, host?.token ?? "");
  try {
    await opened;
    ws.send(
      JSON.stringify({
        type: "hello",
        cid: "e2e-hello",
        pv: 1,
        platform: "web",
        name: "Kuba",
      }),
    );
    const frames = await untilView;
    const welcome = frames.find((f) => f.type === "welcome");
    const view = frames.find((f) => f.type === "view");
    expect(welcome?.seatIds).toContain(host?.seatId);
    expect(view?.view).toMatchObject({ phase: "LOBBY", roomCode: room.code });
    expect(view?.view?.you).toContain(host?.seatId);
  } finally {
    ws.close();
  }
});

test("the deployed web reaches the lobby over the socket", async ({ app, screen, browser }) => {
  await app.open("/");
  await screen.getByRole("button", "EN").tap();
  await screen.getByRole("button", "Own devices").tap();
  await screen.getByRole("button", "Create room").tap();
  // The lobby start button is rendered only after the socket delivers a view.
  await expect(screen.getByRole("button", "Let's play")).toBeVisible({ timeout: 20_000 });
  await expect(browser).toHaveURL(/\/room\/[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
});

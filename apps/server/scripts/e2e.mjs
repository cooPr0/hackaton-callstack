// End-to-end + attack run against a live server (default: wrangler dev).
//   pnpm --filter @tint/server dev -- --var TURN_TIMEOUT_MS:1500   # short timeouts
//   pnpm --filter @tint/server e2e                                # BASE=https://… for prod
// Exits non-zero on any failed check. Plays real games over real WebSockets.
const BASE = process.env.BASE ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

class Client {
  constructor(label, code, tokens, pv = 1) {
    this.label = label;
    this.log = [];
    this.waiters = [];
    this.lastSeq = -1;
    this.leaks = 0;
    this.seqErrors = 0;
    const q = tokens.map((t) => `token=${encodeURIComponent(t)}`).join("&");
    this.ws = new WebSocket(`${WS_BASE}/api/rooms/${code}/ws?${q}&pv=${pv}`);
    this.opened = new Promise((res) => {
      this.ws.onopen = () => res(true);
      this.ws.onerror = () => res(false);
    });
    this.closed = new Promise((res) => {
      this.ws.onclose = (e) => res(e.code);
    });
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "view") {
        if (m.seq <= this.lastSeq) this.seqErrors++;
        this.lastSeq = m.seq;
        const v = m.view;
        const cue = v.cueGiverSeatId && v.you.includes(v.cueGiverSeatId);
        if (v.secret && v.phase !== "REVEAL" && !cue) this.leaks++;
        this.view = v;
      }
      this.log.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (!w.pred(m)) return true;
        w.res(m);
        return false;
      });
    };
  }
  /** First message (already received or future) matching pred. */
  waitFor(pred, ms = 5000) {
    const hit = this.log.find(pred);
    if (hit) return Promise.resolve(hit);
    return new Promise((res) => {
      const w = { pred, res };
      this.waiters.push(w);
      setTimeout(() => res(null), ms);
    });
  }
  next(pred, ms = 5000) {
    const seen = this.log.length;
    return this.waitFor((m) => this.log.indexOf(m) >= seen && pred(m), ms);
  }
  send(msg, cid = crypto.randomUUID()) {
    const p = this.next((m) => (m.type === "ack" || m.type === "error") && m.cid === cid);
    this.ws.send(JSON.stringify({ cid, ...msg }));
    return p;
  }
}

const views = (c, pred, ms) => c.waitFor((m) => m.type === "view" && pred(m.view), ms);

// ── Online stol game: web host + 2 humans + Grok ───────────────────────────
const seats = [
  { name: "Web", kind: "human" },
  { name: "Ola", kind: "human" },
  { name: "Kuba", kind: "human" },
  { name: "Grok", kind: "grok" },
];
const created = await post("/api/rooms", {
  mode: "stol",
  rounds: 1,
  local: false,
  platform: "web",
  botMode: "fallback",
  seats,
});
check(
  created.status === 200 && created.body.seats.length === 1,
  "online create returns only the host token",
);
const code = created.body.code;
const ola = await post(`/api/rooms/${code}/join`, { name: "Ola\u0000‮", platform: "ios" });
const kuba = await post(`/api/rooms/${code}/join`, { name: "Kuba", platform: "web" });
check(ola.status === 200 && kuba.status === 200, "two players join");
check(
  (await post(`/api/rooms/${code}/join`, { name: "X", platform: "web" })).body?.code ===
    "ROOM_FULL",
  "join into a full room → ROOM_FULL",
);
check(
  (await post(`/api/rooms/${code.toLowerCase()}/join`, { name: "X", platform: "web" })).body
    ?.code === "ROOM_FULL",
  "lowercase code resolves to the same room",
);
check((await post("/api/rooms", "{not json")).status === 400, "malformed body → 400");
check(
  (
    await post("/api/rooms", {
      mode: "stol",
      local: false,
      platform: "web",
      seats: [seats[3], seats[0]],
    })
  ).body?.code === "BAD_REQUEST",
  "grok as host → BAD_REQUEST",
);

check(
  !(await new Client("forged", code, ["0".repeat(32)]).opened),
  "forged token can't open a socket",
);
check(
  !(await new Client("pv2", code, [created.body.seats[0].token], 2).opened),
  "protocol mismatch can't open a socket",
);

const host = new Client("host", code, [created.body.seats[0].token]);
const o = new Client("ola", code, [ola.body.token]);
const k1 = new Client("kuba-old", code, [kuba.body.token]);
await Promise.all([host.opened, o.opened, k1.opened]);
for (const c of [host, o]) await c.send({ type: "hello", pv: 1, platform: "web" });
const k2 = new Client("kuba", code, [kuba.body.token]);
await k2.opened;
check((await k1.closed) === 4001, "a second socket for the same seat replaces the first");
await k2.send({ type: "hello", pv: 1, platform: "ios" });
check(
  (await k2.waitFor((m) => m.type === "welcome"))?.seatIds?.join() === kuba.body.seatId,
  "hello → welcome with the socket's seats",
);
check(
  (await views(o, () => true))?.view.seats[1].name === "Ola",
  "control characters stripped from names",
);

o.ws.send(JSON.stringify({ type: "ping", cid: "p1" }));
check(!!(await o.next((m) => m.type === "pong")), "ping → pong");

check((await o.send({ type: "game.start" })).code === "NOT_YOUR_SEAT", "non-host can't start");
check((await host.send({ type: "game.start" })).type === "ack", "host starts");
const s1 = await views(host, (v) => v.phase === "SECRET_1");
check(!!s1?.view.secret && s1.view.cueGiverSeatId === "s1", "cue giver sees the secret");
check(
  !(await views(o, (v) => v.phase === "SECRET_1"))?.view.secret,
  "guesser does not see the secret",
);

check(
  (await host.send({ type: "clue.submit", seatId: "s1", text: "Czerwonawy" })).code ===
    "COLOR_WORD",
  "inflected color word → COLOR_WORD",
);
check(
  (await o.send({ type: "clue.submit", seatId: "s1", text: "rosół" })).code === "NOT_YOUR_SEAT",
  "foreign seatId → NOT_YOUR_SEAT",
);
const clueAt = Date.now();
check(
  (await host.send({ type: "clue.submit", seatId: "s1", text: "rosół" }, "dup-1")).type === "ack",
  "cue giver submits a clue",
);
check(
  (await host.send({ type: "clue.submit", seatId: "s1", text: "rosół" }, "dup-1")).type === "ack",
  "retransmitted cid is acked again, not re-applied",
);

check(
  (await views(o, (v) => v.phase === "GUESS_1"))?.view.turnSeatId === "s4",
  "Grok moves first in GUESS_1",
);
check(
  !!(await o.waitFor((m) => m.type === "bot.status" && m.state === "thinking")),
  "bot.status thinking is broadcast",
);
const afterGrok = await views(o, (v) => v.phase === "GUESS_1" && v.turnSeatId === "s2");
check(
  Date.now() - clueAt >= 1150 && afterGrok?.view.stones.length === 1,
  "Grok places after ≥ 1.2 s of thinking",
);
check(!!(await o.waitFor((m) => m.type === "bot.say")), "Grok says a line");
const grokStone = afterGrok.view.stones[0];
check(
  (await k2.send({ type: "stone.place", seatId: "s3", x: 0, y: 0 })).code === "NOT_YOUR_TURN",
  "out-of-turn stone → NOT_YOUR_TURN",
);
check(
  (await o.send({ type: "stone.place", seatId: "s2", x: grokStone.x, y: grokStone.y })).code ===
    "CELL_TAKEN",
  "taken cell → CELL_TAKEN",
);
check(
  (await o.send({ type: "stone.place", seatId: "s2", x: 99, y: 0 })).code === "BAD_REQUEST",
  "off-board stone → BAD_REQUEST",
);
const free = grokStone.x === 0 && grokStone.y === 0 ? { x: 1, y: 0 } : { x: 0, y: 0 };
check((await o.send({ type: "stone.place", seatId: "s2", ...free })).type === "ack", "Ola places");

const kubaTurn = await views(o, (v) => v.turnSeatId === "s3");
check(typeof kubaTurn?.view.turnDeadline === "number", "online turn carries a deadline");
check(
  !!(await views(o, (v) => v.phase === "SECRET_2", 6000)),
  "silent guesser is skipped on timeout",
);
const s2 = await views(o, (v) => v.phase === "GUESS_2", 8000);
check(
  s2?.view.clues.length === 2,
  "silent cue giver gets a fallback clue on timeout (room never freezes)",
);

await views(o, (v) => v.phase === "GUESS_2" && v.turnSeatId === "s2", 5000);
await o.send({
  type: "stone.place",
  seatId: "s2",
  ...(free.x === 0 ? { x: 2, y: 0 } : { x: 3, y: 0 }),
});
await views(k2, (v) => v.turnSeatId === "s3");
await k2.send({ type: "stone.place", seatId: "s3", x: 5, y: 11 });
const rev = await views(o, (v) => v.phase === "REVEAL");
check(!!rev?.view.reveal && !!rev.view.secret, "REVEAL shows target and awards to everyone");
const deltas = rev.view.reveal.awards.reduce((n, a) => n + a.delta, 0);
check(rev.view.seats.reduce((n, s) => n + s.score, 0) === deltas, "scores equal the sum of awards");
check((await o.send({ type: "round.next" })).type === "ack", "any seat advances");
const over = await views(host, (v) => v.phase === "GAME_OVER");
check(over && !over.view.secret && over.view.history.length === 1, "GAME_OVER: history, no secret");

o.ws.send("x".repeat(5000));
check((await o.closed) === 1009, "oversized frame closes the socket (1009)");

for (const c of [host, o, k2]) {
  check(c.leaks === 0, `${c.label}: no secret leaked before REVEAL`);
  check(c.seqErrors === 0, `${c.label}: seq strictly increasing`);
}

// ── Local pass-and-play: one socket, every human seat ──────────────────────
const local = await post("/api/rooms", {
  mode: "stol",
  rounds: 1,
  local: true,
  platform: "ios",
  botMode: "fallback",
  seats: [seats[0], seats[1], seats[3]],
});
check(local.body?.seats.length === 2, "local create returns every human token");
const dev = new Client(
  "local",
  local.body.code,
  local.body.seats.map((s) => s.token),
);
check(await dev.opened, "one socket opens with repeated ?token=");
await dev.send({ type: "hello", pv: 1, platform: "ios" });
check(
  (await dev.waitFor((m) => m.type === "welcome"))?.seatIds.join() === "s1,s2",
  "local socket controls both human seats",
);
await dev.send({ type: "game.start" });
const lv = await views(dev, (v) => v.phase === "SECRET_1");
check(lv?.view.turnDeadline === null && lv.view.local === true, "local mode runs no timers");
check(
  (await post(`/api/rooms/${local.body.code}/join`, { name: "X", platform: "web" })).body?.code ===
    "ROOM_FULL",
  "nobody can join a local room",
);
dev.ws.close();

// ── Rate limit (last: it burns this IP's create budget for a minute) ───────
let limited = false;
for (let i = 0; i < 25 && !limited; i++) {
  limited =
    (
      await post("/api/rooms", {
        mode: "stol",
        local: true,
        platform: "web",
        botMode: "fallback",
        seats: [seats[0], seats[3]],
      })
    ).status === 429;
}
check(limited, "room creation is rate limited per IP");

await sleep(100);
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);

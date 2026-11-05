// Live checks of the real-Grok path against a mock xAI (no key, no cost).
//   node scripts/mock-xai.mjs 8799 &
//   pnpm exec wrangler dev --port 8797 --var XAI_API_KEY:mock --var XAI_BASE_URL:http://127.0.0.1:8799
//   BASE=http://localhost:8797 MOCK=http://127.0.0.1:8799 pnpm e2e:grok
// Covers: model cell/line used, degraded off, stale reply during pause dropped and re-requested,
// REVEAL defend line, one defend call per round, late defend line dropped after round.next.
const BASE = process.env.BASE ?? "http://localhost:8797";
const MOCK = `${process.env.MOCK ?? "http://127.0.0.1:8799"}/__mock`;
let fails = 0;
const check = (ok, n) => {
  console.log(`${ok ? "✔" : "✘"} ${n}`);
  if (!ok) fails++;
};
const mock = (o) => fetch(MOCK, { method: "POST", body: JSON.stringify(o) }).then((r) => r.json());
async function room() {
  const r = await (
    await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "stol",
        rounds: 1,
        local: true,
        platform: "web",
        botMode: "grok",
        lang: "pl",
        seats: [
          { name: "Ola", kind: "human" },
          { name: "Grok", kind: "grok" },
        ],
      }),
    })
  ).json();
  const ws = new WebSocket(
    `${BASE.replace("http", "ws")}/api/rooms/${r.code}/ws?token=${r.seats[0].token}&pv=1`,
  );
  const log = [];
  ws.onmessage = (e) => log.push(JSON.parse(e.data));
  await new Promise((res) => (ws.onopen = res));
  const send = (m) => ws.send(JSON.stringify({ cid: crypto.randomUUID(), ...m }));
  const view = () => log.filter((m) => m.type === "view").at(-1)?.view;
  const until = async (pred, ms = 8000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      const v = view();
      if (v && pred(v)) return v;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };
  send({ type: "hello", pv: 1, platform: "web" });
  await until((v) => v.phase === "LOBBY");
  send({ type: "game.start" });
  await until((v) => v.phase === "SECRET_1");
  return { ws, log, send, view, until };
}
// A: real-Grok path
await mock({ delayMs: 0, reset: true, guess: { x: 3, y: 4, line: "Czyli rosół z piątku." } });
const A = await room();
check(A.view().lang === "pl", "view carries room lang");
A.send({ type: "clue.submit", seatId: "s1", text: "rosół" });
const afterA = await A.until((v) => v.stones.length === 1);
check(
  afterA?.stones[0]?.x === 3 && afterA?.stones[0]?.y === 4,
  "Grok's stone is the model's cell (3,4)",
);
check(
  A.log.some((m) => m.type === "bot.say" && m.text === "Czyli rosół z piątku."),
  "bot.say carries the model's line",
);
check(
  afterA?.seats.find((s) => s.kind === "grok")?.degraded === false,
  "Grok seat not degraded on the real path",
);
check(
  (await mock({})).calls.filter((c) => c === "guess").length === 1,
  "exactly one xAI guess call",
);
A.ws.close();
// B: stale reply dropped when the turn moves on while Grok awaits xAI
await mock({ delayMs: 3000, reset: true, guess: { x: 7, y: 7, line: "Biorę kratkę głębiej." } });
const B = await room();
B.send({ type: "clue.submit", seatId: "s1", text: "rosół" });
await new Promise((r) => setTimeout(r, 2000)); // bot timer 1.2 s fired, xAI call in flight
B.send({ type: "pause.set", paused: true });
await new Promise((r) => setTimeout(r, 3500)); // reply lands at ~4.2 s, inside the pause → must be dropped
check(B.view().stones.length === 0, "late Grok reply during pause was dropped (no stone)");
B.send({ type: "pause.set", paused: false });
const afterB = await B.until((v) => v.stones.length >= 1, 8000);
await new Promise((r) => setTimeout(r, 1500));
check(
  afterB && B.view().stones.filter((s) => s.seatId === "s2").length === 1,
  "after resume Grok placed exactly one stone",
);
check(
  (await mock({})).calls.filter((c) => c === "guess").length === 2,
  "two xAI calls: the dropped one and the re-armed retry after resume",
);
B.ws.close();

// ── REVEAL defend line ──
async function toReveal(rounds) {
  const r = await (
    await fetch(`${BASE}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "stol",
        rounds,
        local: true,
        platform: "web",
        botMode: "grok",
        seats: [
          { name: "Ola", kind: "human" },
          { name: "Grok", kind: "grok" },
        ],
      }),
    })
  ).json();
  const ws = new WebSocket(
    `${BASE.replace("http", "ws")}/api/rooms/${r.code}/ws?token=${r.seats[0].token}&pv=1`,
  );
  const log = [];
  ws.onmessage = (e) => log.push(JSON.parse(e.data));
  await new Promise((res) => (ws.onopen = res));
  const send = (m) => ws.send(JSON.stringify({ cid: crypto.randomUUID(), ...m }));
  const view = () => log.filter((m) => m.type === "view").at(-1)?.view;
  const until = async (p, ms = 10000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      const v = view();
      if (v && p(v)) return v;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };
  send({ type: "hello", pv: 1, platform: "web" });
  await until((v) => v.phase === "LOBBY");
  send({ type: "game.start" });
  await until((v) => v.phase === "SECRET_1");
  send({ type: "clue.submit", seatId: "s1", text: "rosół" });
  await until((v) => v.phase === "SECRET_2");
  send({ type: "clue.submit", seatId: "s1", text: "z marchewką" });
  await until((v) => v.phase === "REVEAL");
  return { log, send, view, until, ws };
}
await mock({
  delayMs: 0,
  reset: true,
  guess: { x: 3, y: 4, line: "Czyli rosół z piątku." },
  line: { line: "Pachnie mi to niedzielnym obiadem." },
});
const a = await toReveal(1);
const withLine = await a.until((v) => !!v.reveal?.botLine, 4000);
check(
  withLine?.reveal.botLine === "Pachnie mi to niedzielnym obiadem.",
  "REVEAL view gets Grok's defend line",
);
check(
  a.log.some((m) => m.type === "bot.say" && m.text === "Pachnie mi to niedzielnym obiadem."),
  "defend line is also a bot.say",
);
await new Promise((r) => setTimeout(r, 1500));
check(
  (await mock({})).calls.filter((c) => c === "line").length === 1,
  "one defend call per round (no retry loop)",
);
a.ws.close();
// Late line must not land on the next round
await mock({ delayMs: 2500, reset: true, line: { line: "Za późno." } });
const b = await toReveal(2);
b.send({ type: "round.next" });
await b.until((v) => v.phase === "SECRET_1" && v.round === 2);
await new Promise((r) => setTimeout(r, 3500));
check(
  !b.log.some((m) => m.type === "bot.say" && m.text === "Za późno."),
  "a defend line arriving after round.next is dropped",
);
check(b.view().phase === "SECRET_1" && !b.view().reveal, "round 2 has no stale reveal");
b.ws.close();
console.log(fails ? `${fails} failed` : "grok e2e: all checks passed");
process.exit(fails ? 1 : 0);

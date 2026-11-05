/**
 * Generates shared/fixtures/** — the golden JSON every client decodes in its tests
 * (TS via zod here, Swift via JSONDecoder in TintKit). One coherent scenario:
 * room K7PQX, mode "stol", seats Kuba (s1, iOS, host), Ola (s2, web), Grok (s3).
 * Round 3 of 6, Kuba is the cue giver, target (4,4), clues "Rosół" + "z marchewką".
 *
 * Run: pnpm --filter @tint/protocol fixtures:gen   (then commit the JSON)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PlayerView, SeatView, Stone } from "../src";

const root = fileURLToPath(new URL("../../../shared/fixtures/", import.meta.url));
const write = (rel: string, data: unknown) => {
  const path = root + rel;
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

const T0 = 1_762_358_400_000; // fixed epoch ms so fixtures are stable
const target = { x: 4, y: 4 };
const window = { x0: 1, y0: 0, w: 7 as const, h: 9 as const };
const history = [
  { round: 1, cueGiverSeatId: "s1", target: { x: 15, y: 6 }, clues: ["Basen", "pod chmurką"] },
  { round: 2, cueGiverSeatId: "s2", target: { x: 9, y: 3 }, clues: ["Mech", "po deszczu"] },
];

const seats = (scores: [number, number, number], extra: Partial<SeatView>[] = []): SeatView[] =>
  [
    { id: "s1", name: "Kuba", kind: "human", platform: "ios", score: scores[0], connected: true },
    { id: "s2", name: "Ola", kind: "human", platform: "web", score: scores[1], connected: true },
    { id: "s3", name: "Grok", kind: "grok", platform: null, score: scores[2], connected: true },
  ].map((s, i) => ({ ...s, ...extra[i] })) as SeatView[];

const stones1: Stone[] = [{ seatId: "s3", x: 6, y: 6, n: 1 }];
const stones1done: Stone[] = [...stones1, { seatId: "s2", x: 2, y: 2, n: 1 }];
const stones2: Stone[] = [...stones1done, { seatId: "s3", x: 5, y: 3, n: 2 }];
const stonesAll: Stone[] = [...stones2, { seatId: "s2", x: 4, y: 4, n: 2 }];

const base: PlayerView = {
  v: 1,
  roomCode: "K7PQX",
  mode: "stol",
  local: false,
  lang: "pl",
  phase: "SECRET_1",
  round: 3,
  totalRounds: 6,
  paused: false,
  hostSeatId: "s1",
  seats: seats([4, 6, 5]),
  you: ["s2"],
  cueGiverSeatId: "s1",
  turnSeatId: null,
  turnDeadline: null,
  clues: [],
  stones: [],
  history,
};

const views: Record<string, PlayerView> = {
  lobby: {
    ...base,
    phase: "LOBBY",
    round: 0,
    you: ["s1"],
    cueGiverSeatId: null,
    seats: seats([0, 0, 0], [{}, { platform: "web" }, {}]),
    history: [],
  },
  "secret1-cuegiver": { ...base, you: ["s1"], secret: { target, window } },
  "secret1-guesser": { ...base },
  guess1: {
    ...base,
    phase: "GUESS_1",
    clues: ["Rosół"],
    stones: stones1,
    turnSeatId: "s2",
    turnDeadline: T0 + 60_000,
  },
  "secret2-cuegiver": {
    ...base,
    phase: "SECRET_2",
    you: ["s1"],
    clues: ["Rosół"],
    stones: stones1done,
    secret: { target, window },
  },
  guess2: {
    ...base,
    phase: "GUESS_2",
    clues: ["Rosół", "z marchewką"],
    stones: stones2,
    turnSeatId: "s2",
    turnDeadline: T0 + 120_000,
  },
  reveal: {
    ...base,
    phase: "REVEAL",
    clues: ["Rosół", "z marchewką"],
    stones: stonesAll,
    seats: seats([6, 10, 8]),
    secret: { target, window },
    reveal: {
      target,
      awards: [
        { seatId: "s2", delta: 1, reason: "far" },
        { seatId: "s2", delta: 3, reason: "exact" },
        { seatId: "s3", delta: 1, reason: "far" },
        { seatId: "s3", delta: 2, reason: "near" },
        { seatId: "s1", delta: 2, reason: "house" },
      ],
      botLine: "Czyli rosół z piątku.",
    },
  },
  gameover: {
    ...base,
    phase: "GAME_OVER",
    round: 6,
    seats: seats([14, 19, 15]),
    cueGiverSeatId: null,
    history: [
      ...history,
      { round: 3, cueGiverSeatId: "s1", target, clues: ["Rosół", "z marchewką"] },
      { round: 4, cueGiverSeatId: "s2", target: { x: 20, y: 8 }, clues: ["Burak", "z chrzanem"] },
      { round: 5, cueGiverSeatId: "s1", target: { x: 12, y: 1 }, clues: ["Lód", "miętowy"] },
      { round: 6, cueGiverSeatId: "s2", target: { x: 1, y: 10 }, clues: ["Cegła", "mokra"] },
    ],
  },
  "local-guess1": {
    ...base,
    local: true,
    phase: "GUESS_1",
    you: ["s1", "s2"],
    seats: seats([4, 6, 5], [{ platform: "ios" }, { platform: "ios" }, {}]),
    clues: ["Rosół"],
    stones: stones1,
    turnSeatId: "s2",
    // local mode: the one device holds the cue-giver seat → it gets the secret,
    // and the client must only render it while the phone is CLOSED.
    secret: { target, window },
  },
  "grok-secret1": {
    ...base,
    mode: "grok",
    cueGiverSeatId: "s3",
    you: ["s1"],
  },
};

for (const [name, view] of Object.entries(views)) write(`views/${name}.json`, view);

const messages: Record<string, unknown> = {
  // client → server
  "client.hello": { type: "hello", cid: "c-0001", pv: 1, platform: "web", name: "Ola" },
  "client.game.start": { type: "game.start", cid: "c-0002" },
  "client.clue.submit": { type: "clue.submit", cid: "c-0003", seatId: "s1", text: "Rosół" },
  "client.stone.place": { type: "stone.place", cid: "c-0004", seatId: "s2", x: 2, y: 2 },
  "client.round.next": { type: "round.next", cid: "c-0005" },
  "client.pause.set": { type: "pause.set", cid: "c-0006", paused: true },
  "client.game.end": { type: "game.end", cid: "c-0007" },
  "client.ping": { type: "ping", cid: "c-0008" },
  // server → client
  "server.welcome": { type: "welcome", seatIds: ["s2"], serverTime: T0, protocol: 1 },
  "server.view": { type: "view", seq: 42, view: views.guess1 },
  "server.bot.status": { type: "bot.status", seatId: "s3", state: "thinking" },
  "server.bot.say": {
    type: "bot.say",
    seatId: "s3",
    text: "Złoty, ale nie z puszki. Biorę kratkę głębiej.",
  },
  "server.ack": { type: "ack", cid: "c-0004" },
  "server.error": {
    type: "error",
    cid: "c-0004",
    code: "CELL_TAKEN",
    message: "Ta kratka jest zajęta.",
  },
  "server.pong": { type: "pong" },
  // HTTP
  "http.create-room.request": {
    mode: "stol",
    rounds: 6,
    local: false,
    platform: "ios",
    seats: [
      { name: "Kuba", kind: "human" },
      { name: "Ola", kind: "human" },
      { name: "Grok", kind: "grok" },
    ],
    botMode: "grok",
    lang: "pl",
  },
  "http.create-room.response": {
    code: "K7PQX",
    seats: [{ seatId: "s1", token: "tok_fixture_s1_0000000000000000" }],
  },
  "http.join.request": { name: "Ola", platform: "web" },
  "http.join.response": { seatId: "s2", token: "tok_fixture_s2_0000000000000000" },
  "http.health": { ok: true, version: "0.1.0", protocol: 1 },
};

for (const [name, msg] of Object.entries(messages)) write(`messages/${name}.json`, msg);

console.log(
  `wrote ${Object.keys(views).length} views, ${Object.keys(messages).length} messages → ${root}`,
);

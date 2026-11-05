import { DurableObject } from "cloudflare:workers";
import {
  type Action,
  actor,
  apply,
  type CreateRoom,
  createGame,
  type GameState,
  isOpenSeat,
  turnKey,
} from "@tint/game-core";
import {
  BOT_MIN_THINK_MS,
  type ClientMessage,
  ClientMessage as ClientMessageSchema,
  type ErrorCode,
  ONLINE_TURN_TIMEOUT_MS,
  type Platform,
  PROTOCOL_VERSION,
  type ServerMessage,
} from "@tint/protocol";
import { fallbackClue, fallbackGuess } from "./bot/fallback";
import { projectView } from "./projection";
import { cleanName, httpError, newToken, sha256 } from "./util";

/** A timer belongs to one turn (turnKey). If the turn moved on, it's dropped, never applied. */
interface Timer {
  key: string;
  dueAt: number;
}
/** Server bookkeeping, persisted in the same atomic put as the game. */
interface Meta {
  /** Recently applied `seatId:cid`. A retransmit gets its ack again but is not re-applied. */
  cids: string[];
  bot?: Timer;
  turn?: Timer;
  expireAt: number;
}
/** Seats a socket controls (authenticated at upgrade); `ready` once it said hello. */
interface Attachment {
  seatIds: string[];
  ready: boolean;
}

const MAX_FRAME = 4096;
const MAX_TOKENS = 8;
const CID_MEMORY = 64;
const RATE = { max: 20, windowMs: 5_000 };
const CLUE_TIMEOUT_MS = 90_000;
const IDLE_TTL_MS = 2 * 60 * 60_000;
const GAME_OVER_TTL_MS = 10 * 60_000;

const isSecret = (p: GameState["phase"]): p is "SECRET_1" | "SECRET_2" =>
  p === "SECRET_1" || p === "SECRET_2";
const att = (ws: WebSocket): Attachment =>
  (ws.deserializeAttachment() as Attachment | null) ?? { seatIds: [], ready: false };
const send = (ws: WebSocket, msg: ServerMessage) => {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // socket already closing; its close handler cleans up
  }
};
const errorMsg = (cid: string | undefined, code: ErrorCode, message: string): ServerMessage => ({
  type: "error",
  ...(cid ? { cid } : {}),
  code,
  message,
});

type Fail = { ok: false; status: number; code: ErrorCode; message: string };

export class Room extends DurableObject<Env> {
  private game: GameState | undefined;
  private meta: Meta = { cids: [], expireAt: 0 };
  // ponytail: in-memory, so it resets when the DO hibernates. Fine for a per-socket flood guard.
  private rate = new WeakMap<WebSocket, { start: number; n: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.game = await ctx.storage.get<GameState>("game");
      this.meta = (await ctx.storage.get<Meta>("meta")) ?? this.meta;
    });
  }

  // ── RPC from the router ───────────────────────────────────────────────────

  /** `collision: true` when this code already hosts a room; the router retries with a new code. */
  async init(
    code: string,
    req: CreateRoom,
  ): Promise<
    { ok: true; seats: { seatId: string; token: string }[] } | (Fail & { collision?: true })
  > {
    if (this.game)
      return { ok: false, status: 409, code: "ROOM_FULL", message: "code taken", collision: true };
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
    const seats = req.seats.map((s) => ({
      ...s,
      name: cleanName(s.name, s.kind === "grok" ? "Grok" : "Gracz"),
    }));
    const created = createGame({ ...req, seats }, code, seed);
    if (!created.ok)
      return { ok: false, status: 400, code: created.code, message: created.message };
    const g = created.state;
    const out: { seatId: string; token: string }[] = [];
    for (const s of g.seats) {
      if (s.kind !== "human" || (!g.local && s.id !== g.hostSeatId)) continue;
      const token = newToken();
      s.tokenHash = await sha256(token);
      out.push({ seatId: s.id, token });
    }
    // Re-check after the awaits: a concurrent init for the same code must not overwrite a room.
    if (this.game)
      return { ok: false, status: 409, code: "ROOM_FULL", message: "code taken", collision: true };
    this.game = g;
    this.meta = { cids: [], expireAt: 0 };
    await this.commit();
    return { ok: true, seats: out };
  }

  async join(
    name: string,
    platform: Platform,
  ): Promise<{ ok: true; seatId: string; token: string } | Fail> {
    // Hash first: after this await nothing yields until the seat is claimed, so two concurrent
    // joins can never pick the same open seat.
    const token = newToken();
    const tokenHash = await sha256(token);
    const g = this.game;
    if (!g) return { ok: false, status: 404, code: "ROOM_NOT_FOUND", message: "unknown room" };
    if (g.phase !== "LOBBY")
      return { ok: false, status: 409, code: "ROOM_FULL", message: "game already started" };
    const seat = g.seats.find(isOpenSeat);
    if (!seat) return { ok: false, status: 409, code: "ROOM_FULL", message: "room is full" };
    seat.tokenHash = tokenHash;
    seat.name = cleanName(name, seat.name);
    seat.platform = platform;
    await this.commit();
    return { ok: true, seatId: seat.id, token };
  }

  /** WebSocket upgrade. Auth happens here, before the socket exists: `?token=` (repeat it to claim several seats). */
  override async fetch(req: Request): Promise<Response> {
    if (!this.game) return httpError(404, "ROOM_NOT_FOUND", "unknown room");
    const url = new URL(req.url);
    if (url.searchParams.get("pv") !== String(PROTOCOL_VERSION)) {
      return httpError(426, "PROTOCOL_MISMATCH", `server speaks protocol ${PROTOCOL_VERSION}`);
    }
    const tokens = url.searchParams.getAll("token");
    if (tokens.length === 0 || tokens.length > MAX_TOKENS)
      return httpError(401, "BAD_TOKEN", "missing token");
    const hashes = await Promise.all(tokens.map(sha256));
    const g = this.game;
    if (!g) return httpError(404, "ROOM_NOT_FOUND", "unknown room");
    const seatIds = [...new Set(hashes.map((h) => g.seats.find((s) => s.tokenHash === h)?.id))];
    if (seatIds.some((id) => id === undefined)) return httpError(401, "BAD_TOKEN", "unknown token");
    const mine = seatIds as string[];

    // One live socket per seat: a second device (or a reconnect racing a dead socket) replaces the old one.
    for (const ws of this.ctx.getWebSockets()) {
      if (att(ws).seatIds.some((id) => mine.includes(id))) {
        ws.serializeAttachment({ seatIds: [], ready: false } satisfies Attachment);
        ws.close(4001, "replaced by a newer connection");
      }
    }
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seatIds: mine, ready: false } satisfies Attachment);
    await this.commit();
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── WebSocket events ──────────────────────────────────────────────────────

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const a = att(ws);
    const g = this.game;
    if (!g || a.seatIds.length === 0) return ws.close(1008, "not in a room");
    if (typeof raw !== "string" || raw.length > MAX_FRAME) {
      send(ws, errorMsg(undefined, "BAD_REQUEST", "binary or oversized frame"));
      return ws.close(1009, "frame too large");
    }
    if (!this.allow(ws)) return send(ws, errorMsg(undefined, "RATE_LIMITED", "slow down"));

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return send(ws, errorMsg(undefined, "BAD_REQUEST", "invalid JSON"));
    }
    const parsed = ClientMessageSchema.safeParse(json);
    if (!parsed.success) {
      const j = json as { cid?: unknown; type?: unknown; pv?: unknown } | null;
      const cid = typeof j?.cid === "string" && j.cid.length <= 64 ? j.cid : undefined;
      const mismatch = j?.type === "hello" && j.pv !== PROTOCOL_VERSION;
      return send(
        ws,
        errorMsg(cid, mismatch ? "PROTOCOL_MISMATCH" : "BAD_REQUEST", "invalid message"),
      );
    }
    const m = parsed.data;
    // ping carries a cid, so setWebSocketAutoResponse (exact string match) can't answer it.
    // ponytail: every ping wakes the DO; switch clients to a bare "ping" string if duration cost matters.
    if (m.type === "ping") return send(ws, { type: "pong" });
    if (m.type === "hello") return this.hello(ws, a, m);

    const dedupeKey = `${a.seatIds[0]}:${m.cid}`;
    if (this.meta.cids.includes(dedupeKey)) return send(ws, { type: "ack", cid: m.cid });
    const action = this.toAction(g, m, a.seatIds);
    if ("code" in action) return send(ws, errorMsg(m.cid, action.code, action.message));
    const r = apply(g, action);
    if (!r.ok) return send(ws, errorMsg(m.cid, r.code, r.message));
    this.game = r.state;
    this.meta.cids = [...this.meta.cids, dedupeKey].slice(-CID_MEMORY);
    await this.commit();
    send(ws, { type: "ack", cid: m.cid });
  }

  override async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "closed");
    } catch {
      // already closed (auto-reply to close)
    }
    if (att(ws).seatIds.length > 0 && this.game) await this.commit(ws);
  }

  override async webSocketError(ws: WebSocket) {
    if (att(ws).seatIds.length > 0 && this.game) await this.commit(ws);
  }

  // ── Alarm: bot moves, timeouts, expiry (one slot, earliest due time) ─────

  override async alarm() {
    if (!this.game) return;
    const now = Date.now();
    const m = this.meta;
    if (now >= m.expireAt) return this.destroy();
    if (m.turn && now >= m.turn.dueAt) {
      const { key } = m.turn;
      m.turn = undefined;
      this.onTimeout(key);
    }
    if (m.bot && now >= m.bot.dueAt) await this.onBot(m.bot.key);
    await this.commit();
  }

  /** Online only: a silent guesser is skipped; a silent cue giver gets a fallback clue. */
  private onTimeout(key: string) {
    const g = this.game;
    const who = g && actor(g);
    if (!g?.current || !who || turnKey(g) !== key) return;
    this.applyInternal(
      isSecret(g.phase)
        ? { type: "clue", seatId: who, text: fallbackClue(g.current.target, g.phase) }
        : { type: "skip", seatId: who, reason: "timeout" },
    );
  }

  private async onBot(key: string) {
    const g = this.game;
    const who = g && actor(g);
    if (!g || !who || turnKey(g) !== key) {
      this.meta.bot = undefined;
      return;
    }
    const move = await this.think(g, who);
    // Messages are processed while think() awaits. If the turn moved on (timeout, pause, end), drop the move.
    if (!this.game || turnKey(this.game) !== key) return;
    this.meta.bot = undefined;
    if (move.line) this.sendAll({ type: "bot.say", seatId: who, text: move.line });
    this.sendAll({ type: "bot.status", seatId: who, state: "idle" });
    this.applyInternal(move.action);
  }

  /**
   * Grok's move. ponytail: fallback only. The xAI call (p1/grok) plugs in here and keeps the
   * stale-turn guard in onBot(). Mark the seat degraded while a "grok" room runs on the fallback.
   */
  private async think(g: GameState, seatId: string): Promise<{ action: Action; line?: string }> {
    const seat = g.seats.find((s) => s.id === seatId);
    if (seat) seat.degraded = g.botMode === "grok";
    const r = g.current;
    if (!r) throw new Error("no round");
    if (isSecret(g.phase))
      return { action: { type: "clue", seatId, text: fallbackClue(r.target, g.phase) } };
    const { x, y, line } = fallbackGuess(r.clues, r.stones);
    return { action: { type: "stone", seatId, x, y }, line };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async hello(ws: WebSocket, a: Attachment, m: Extract<ClientMessage, { type: "hello" }>) {
    const g = this.game;
    if (!g) return;
    for (const s of g.seats) {
      if (!a.seatIds.includes(s.id)) continue;
      s.platform = m.platform;
      if (m.name && a.seatIds.length === 1) s.name = cleanName(m.name, s.name);
    }
    ws.serializeAttachment({ ...a, ready: true } satisfies Attachment);
    send(ws, {
      type: "welcome",
      seatIds: a.seatIds,
      serverTime: Date.now(),
      protocol: PROTOCOL_VERSION,
    });
    send(ws, { type: "ack", cid: m.cid });
    await this.commit(); // pushes the view to this socket (and the platform/name change to everyone)
  }

  private toAction(
    g: GameState,
    m: ClientMessage,
    seatIds: string[],
  ): Action | { code: ErrorCode; message: string } {
    const by = seatIds.includes(g.hostSeatId) ? g.hostSeatId : (seatIds[0] as string);
    const notYours = { code: "NOT_YOUR_SEAT" as const, message: "you don't control that seat" };
    switch (m.type) {
      case "game.start":
        return { type: "start", by };
      case "game.end":
        return { type: "end", by };
      case "round.next":
        return { type: "next", by };
      case "pause.set":
        return { type: "pause", paused: m.paused, by };
      case "clue.submit":
        return seatIds.includes(m.seatId)
          ? { type: "clue", seatId: m.seatId, text: m.text }
          : notYours;
      case "stone.place":
        return seatIds.includes(m.seatId)
          ? { type: "stone", seatId: m.seatId, x: m.x, y: m.y }
          : notYours;
      default:
        return { code: "BAD_REQUEST", message: "unexpected message" };
    }
  }

  private applyInternal(action: Action) {
    if (!this.game) return;
    const r = apply(this.game, action);
    if (r.ok) this.game = r.state;
    else console.error("internal action rejected", action.type, r.code, r.message);
  }

  /** Every state change ends here: bump seq, re-time the turn, persist atomically, re-arm, push views. */
  private async commit(closing?: WebSocket) {
    const g = this.game;
    if (!g) return;
    const now = Date.now();
    g.seq++;
    const live = new Set(
      this.ctx
        .getWebSockets()
        .filter((ws) => ws !== closing)
        .flatMap((ws) => att(ws).seatIds),
    );
    for (const s of g.seats) s.connected = s.kind === "grok" || live.has(s.id);
    this.reschedule(g, now);
    await this.ctx.storage.put({ game: g, meta: this.meta });
    const due = [this.meta.bot?.dueAt, this.meta.turn?.dueAt, this.meta.expireAt].filter(
      (t): t is number => typeof t === "number",
    );
    await this.ctx.storage.setAlarm(Math.min(...due));
    for (const ws of this.ctx.getWebSockets()) {
      const a = att(ws);
      if (ws !== closing && a.ready && a.seatIds.length > 0) {
        send(ws, { type: "view", seq: g.seq, view: projectView(g, a.seatIds) });
      }
    }
  }

  /** Arms at most one timer per turn. An already-timed turn keeps its timer, so commits don't extend deadlines. */
  private reschedule(g: GameState, now: number) {
    const m = this.meta;
    m.expireAt = now + (g.phase === "GAME_OVER" ? GAME_OVER_TTL_MS : IDLE_TTL_MS);
    const who = actor(g);
    const key = turnKey(g);
    if (!who || !g.current) {
      m.bot = m.turn = undefined; // ponytail: pause resets the turn clock instead of freezing the remainder
      if (g.current) g.current.turnDeadline = null;
      return;
    }
    if (m.bot?.key === key || m.turn?.key === key) return;
    m.bot = m.turn = undefined;
    if (g.seats.find((s) => s.id === who)?.kind === "grok") {
      m.bot = { key, dueAt: now + BOT_MIN_THINK_MS };
      this.sendAll({ type: "bot.status", seatId: who, state: "thinking" });
    } else if (!g.local) {
      const ms = isSecret(g.phase)
        ? CLUE_TIMEOUT_MS
        : Number(this.env.TURN_TIMEOUT_MS) || ONLINE_TURN_TIMEOUT_MS;
      m.turn = { key, dueAt: now + ms };
    }
    g.current.turnDeadline = m.turn?.dueAt ?? null;
  }

  private sendAll(msg: ServerMessage) {
    for (const ws of this.ctx.getWebSockets()) if (att(ws).ready) send(ws, msg);
  }

  private allow(ws: WebSocket) {
    const now = Date.now();
    const r = this.rate.get(ws);
    if (!r || now - r.start > RATE.windowMs) {
      this.rate.set(ws, { start: now, n: 1 });
      return true;
    }
    return ++r.n <= RATE.max;
  }

  private async destroy() {
    for (const ws of this.ctx.getWebSockets()) ws.close(1001, "room expired");
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.game = undefined;
    this.meta = { cids: [], expireAt: 0 };
  }
}

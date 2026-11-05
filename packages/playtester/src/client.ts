import {
  type ClientMessage,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type Platform,
  type PlayerView,
  PROTOCOL_VERSION,
  ServerMessage,
} from "@tint/protocol";

/** A frame that arrived from the server, stamped with the local receive time. */
export type Frame = { at: number; raw: unknown; msg: ServerMessage | null };
type Listener = (f: Frame) => void;

export async function post<T>(base: string, path: string, body: unknown) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: r.status, body: (await r.json().catch(() => null)) as T };
}

export const createRoom = (base: string, req: CreateRoomRequest) =>
  post<CreateRoomResponse & { code?: string }>(base, "/api/rooms", req);
export const joinRoom = (base: string, code: string, name: string, platform: Platform) =>
  post<JoinRoomResponse & { code?: string }>(base, `/api/rooms/${code}/join`, { name, platform });

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * One WebSocket for one or more seats. Tracks acks by cid, keeps the latest view, parses every
 * frame against the protocol schema (a frame that does not parse is recorded with `msg: null`),
 * and can reconnect with the same tokens.
 */
export class PlaytestClient {
  readonly frames: Frame[] = [];
  view: PlayerView | undefined;
  seatIds: string[] = [];
  closeCode: number | undefined;
  private ws!: WebSocket;
  private listeners = new Set<Listener>();
  private pending = new Map<string, (m: ServerMessage) => void>();

  constructor(
    readonly label: string,
    readonly base: string,
    readonly code: string,
    readonly tokens: string[],
    readonly platform: Platform = "web",
    readonly pv: number = PROTOCOL_VERSION,
  ) {}

  /** Opens the socket and says hello. Resolves false if the server refused it. */
  async open(): Promise<boolean> {
    const q = this.tokens.map((t) => `token=${encodeURIComponent(t)}`).join("&");
    const url = `${this.base.replace(/^http/, "ws")}/api/rooms/${this.code}/ws?${q}&pv=${this.pv}`;
    this.closeCode = undefined;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (e) => this.receive(String(e.data));
    ws.onclose = (e) => {
      this.closeCode = e.code;
    };
    const opened = await new Promise<boolean>((res) => {
      ws.onopen = () => res(true);
      ws.onerror = () => res(false);
    });
    if (!opened) return false;
    const ack = await this.send({ type: "hello", pv: PROTOCOL_VERSION, platform: this.platform });
    return ack.type !== "error";
  }

  /** Drops the socket and reconnects with the same tokens (a client's flaky network). */
  async reconnect() {
    this.ws.close(1000);
    await sleep(50);
    this.view = undefined;
    return this.open();
  }

  close() {
    this.ws.close(1000);
  }

  onFrame(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private receive(data: string) {
    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      raw = data;
    }
    const parsed = ServerMessage.safeParse(raw);
    const msg = parsed.success ? parsed.data : null;
    const frame: Frame = { at: Date.now(), raw, msg };
    if (msg?.type === "view") this.view = msg.view;
    if (msg?.type === "welcome") this.seatIds = msg.seatIds;
    if (msg && (msg.type === "ack" || msg.type === "error") && msg.cid) {
      this.pending.get(msg.cid)?.(msg);
      this.pending.delete(msg.cid);
    }
    this.frames.push(frame);
    for (const l of this.listeners) l(frame);
  }

  /** Sends a message and waits for its ack or error (a synthetic INTERNAL error on timeout). */
  send(
    msg: { type: ClientMessage["type"] } & Record<string, unknown>,
    cid: string = crypto.randomUUID(),
    timeoutMs = 5000,
  ): Promise<ServerMessage> {
    return new Promise((res) => {
      const t = setTimeout(() => {
        this.pending.delete(cid);
        res({ type: "error", cid, code: "INTERNAL", message: "playtester: ack timeout" });
      }, timeoutMs);
      this.pending.set(cid, (m) => {
        clearTimeout(t);
        res(m);
      });
      this.ws.send(JSON.stringify({ cid, ...msg }));
    });
  }

  /** Raw frame for attack tests (bad JSON, oversize, unknown types). */
  sendRaw(data: string) {
    this.ws.send(data);
  }

  /** First frame (already received or future) matching pred, or null after `ms`. */
  waitFor(pred: (m: ServerMessage) => boolean, ms = 5000): Promise<ServerMessage | null> {
    const hit = this.frames.find((f) => f.msg && pred(f.msg));
    if (hit?.msg) return Promise.resolve(hit.msg);
    return new Promise((res) => {
      const off = this.onFrame((f) => {
        if (f.msg && pred(f.msg)) {
          clearTimeout(t);
          off();
          res(f.msg);
        }
      });
      const t = setTimeout(() => {
        off();
        res(null);
      }, ms);
    });
  }

  waitView(pred: (v: PlayerView) => boolean, ms = 10_000) {
    return this.waitFor((m) => m.type === "view" && pred(m.view), ms);
  }
}

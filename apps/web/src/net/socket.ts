import {
  type ClientMessage,
  PING_INTERVAL_MS,
  PROTOCOL_VERSION,
  type ServerMessage,
  ServerMessage as ServerMessageSchema,
} from "@tint/protocol";
import type { ConnState } from "../app/types";
import { type ApiError, fromCode, networkError } from "./errors";

/** The subset of the browser WebSocket we use — injectable for tests and the mock. */
export interface WSLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
export type WSFactory = (url: string) => WSLike;

/** Payload of a client message without the envelope id. */
export type Outgoing = ClientMessage extends infer M
  ? M extends { cid: string }
    ? Omit<M, "cid">
    : never
  : never;

/** Close codes after which reconnecting is pointless (bad token / protocol mismatch). */
export const FATAL_CLOSE_CODES = new Set([4401, 4426]);
const OPEN = 1;

export interface RoomSocketOptions {
  url: string;
  hello: { platform: "web"; name?: string };
  onMessage(msg: ServerMessage): void;
  onStatus(state: ConnState): void;
  createSocket?: WSFactory;
  ackTimeoutMs?: number;
  pingMs?: number;
  maxAttempts?: number;
  random?: () => number;
  newCid?: () => string;
}

/** Common surface of the real socket and the mock (net/mock.ts). */
export interface RoomConnection {
  connect(): void;
  close(): void;
  retry(): void;
  send(msg: Outgoing): Promise<void>;
}

interface Pending {
  resolve(): void;
  reject(e: ApiError): void;
  timer: ReturnType<typeof setTimeout>;
}

/** Backoff for the n-th consecutive failed attempt (1-based): 0.5 s · 2ⁿ⁻¹, ±20 %, max 8 s. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(8_000, 500 * 2 ** Math.max(0, attempt - 1));
  return Math.round(base * (0.8 + 0.4 * random()));
}

/**
 * One WebSocket to a room. Sends `hello` on open, matches ack/error to requests by `cid`,
 * drops stale `view` snapshots (seq ≤ last), keeps alive with `ping`, reconnects with backoff.
 */
export class RoomSocket implements RoomConnection {
  private ws: WSLike | null = null;
  private pending = new Map<string, Pending>();
  private lastSeq = -1;
  private attempts = 0;
  private intentional = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly o: Required<Omit<RoomSocketOptions, "hello">> & Pick<RoomSocketOptions, "hello">;

  constructor(opts: RoomSocketOptions) {
    this.o = {
      createSocket: (url) => new WebSocket(url) as unknown as WSLike,
      ackTimeoutMs: 5_000,
      pingMs: PING_INTERVAL_MS,
      maxAttempts: 10,
      random: Math.random,
      newCid: () => crypto.randomUUID(),
      ...opts,
    };
  }

  connect(): void {
    this.intentional = false;
    this.clearReconnect();
    this.o.onStatus(this.attempts === 0 ? "connecting" : "reconnecting");
    const ws = this.o.createSocket(this.o.url);
    this.ws = ws;
    ws.onopen = () => this.handleOpen();
    ws.onmessage = (ev) => this.handleMessage(ev.data);
    ws.onclose = (ev) => this.handleClose(ev.code);
    ws.onerror = () => {
      /* onclose follows and decides */
    };
  }

  /** Manual retry after `failed`. */
  retry(): void {
    this.attempts = 0;
    this.connect();
  }

  close(): void {
    this.intentional = true;
    this.clearReconnect();
    this.stopPing();
    this.ws?.close(1000, "bye");
    this.ws = null;
    this.failAll(networkError());
    this.o.onStatus("closed");
  }

  send(msg: Outgoing): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) return Promise.reject(networkError());
    const cid = this.o.newCid();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(cid);
        reject(fromCode("TIMEOUT"));
      }, this.o.ackTimeoutMs);
      this.pending.set(cid, { resolve, reject, timer });
      ws.send(JSON.stringify({ ...msg, cid }));
    });
  }

  private raw(msg: Outgoing) {
    if (this.ws?.readyState === OPEN)
      this.ws.send(JSON.stringify({ ...msg, cid: this.o.newCid() }));
  }

  private handleOpen() {
    this.attempts = 0;
    this.o.onStatus("open");
    this.raw({ type: "hello", pv: PROTOCOL_VERSION, ...this.o.hello });
    this.stopPing();
    this.pingTimer = setInterval(() => this.raw({ type: "ping" }), this.o.pingMs);
  }

  private handleMessage(data: unknown) {
    let json: unknown;
    try {
      json = JSON.parse(String(data));
    } catch {
      return;
    }
    const parsed = ServerMessageSchema.safeParse(json);
    if (!parsed.success) {
      if (import.meta.env?.DEV)
        console.warn("[socket] dropped invalid frame", parsed.error.message);
      return;
    }
    const msg = parsed.data;
    switch (msg.type) {
      case "welcome":
        this.lastSeq = -1; // fresh snapshot stream after (re)connect
        break;
      case "view":
        if (msg.seq <= this.lastSeq) return;
        this.lastSeq = msg.seq;
        break;
      case "ack":
        this.settle(msg.cid);
        return;
      case "error":
        if (msg.cid && this.pending.has(msg.cid)) {
          this.settle(msg.cid, fromCode(msg.code));
          return;
        }
        break;
      case "pong":
        return;
    }
    this.o.onMessage(msg);
  }

  private handleClose(code: number) {
    this.stopPing();
    this.ws = null;
    this.failAll(networkError());
    if (this.intentional) return;
    if (FATAL_CLOSE_CODES.has(code)) {
      this.o.onStatus("failed");
      return;
    }
    this.attempts += 1;
    if (this.attempts > this.o.maxAttempts) {
      this.o.onStatus("failed");
      return;
    }
    this.o.onStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => this.connect(), backoffMs(this.attempts, this.o.random));
  }

  private settle(cid: string, err?: ApiError) {
    const p = this.pending.get(cid);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(cid);
    if (err) p.reject(err);
    else p.resolve();
  }

  private failAll(err: ApiError) {
    for (const [cid, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
      this.pending.delete(cid);
    }
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private clearReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

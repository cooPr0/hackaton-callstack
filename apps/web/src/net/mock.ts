import type { PlayerView, ServerMessage } from "@tint/protocol";
import { BOT_MIN_THINK_MS } from "@tint/protocol";
import { fixture } from "../dev/fixtures";
import type { ConnectHandlers } from "../store/game";
import { fromCode, networkError } from "./errors";
import type { Outgoing, RoomConnection } from "./socket";

/** Room codes starting with this prefix use the mock instead of the server. */
export const DEMO_PREFIX = "DEMO";
export const isDemoRoom = (code: string) => code.toUpperCase().startsWith(DEMO_PREFIX);

const asLocal = (v: PlayerView): PlayerView => ({ ...v, local: true, you: ["s1", "s2"] });

/**
 * A scripted local game (Kuba + Ola on one device, Grok) driven by the golden fixtures.
 * For /room/DEMO…: click-through demos, Lane B screen work, and a fallback when the server is down.
 * It is NOT a rules engine — it just advances through a fixed sequence of snapshots.
 */
export class MockConnection implements RoomConnection {
  private seq = 0;
  private view: PlayerView | null = null;
  private open = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly h: Pick<ConnectHandlers, "onMessage" | "onStatus">,
    private readonly delayMs = 250,
  ) {}

  connect() {
    this.h.onStatus("connecting");
    this.later(() => {
      this.open = true;
      this.h.onStatus("open");
      this.emit({ type: "welcome", seatIds: ["s1", "s2"], serverTime: Date.now(), protocol: 1 });
      this.show({
        ...asLocal(fixture("lobby")),
        seats: fixture("guess1").seats.map((s) => ({ ...s, score: 0 })),
      });
    });
  }

  retry() {
    this.connect();
  }

  close() {
    this.open = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.h.onStatus("closed");
  }

  async send(msg: Outgoing): Promise<void> {
    if (!this.open || !this.view) throw networkError();
    const v = this.view;
    const phase = v.phase;
    switch (msg.type) {
      case "game.start":
        return this.step(() => this.show(asLocal(fixture("secret1-cuegiver"))));
      case "clue.submit": {
        if (phase !== "SECRET_1" && phase !== "SECRET_2") throw fromCode("WRONG_PHASE");
        const first = phase === "SECRET_1";
        const clues = first ? [msg.text] : [v.clues[0] ?? "", msg.text];
        const base = asLocal(fixture(first ? "guess1" : "guess2"));
        const stones = first ? [] : v.stones;
        return this.step(() => {
          this.show({
            ...base,
            clues,
            stones,
            turnSeatId: "s3",
            turnDeadline: null,
            secret: v.secret,
          });
          this.grokMoves(first ? 1 : 2);
        });
      }
      case "stone.place": {
        if (phase !== "GUESS_1" && phase !== "GUESS_2") throw fromCode("WRONG_PHASE");
        if (v.turnSeatId !== msg.seatId) throw fromCode("NOT_YOUR_TURN");
        if (v.stones.some((s) => s.x === msg.x && s.y === msg.y)) throw fromCode("CELL_TAKEN");
        const n = phase === "GUESS_1" ? 1 : 2;
        const stones = [...v.stones, { seatId: msg.seatId, x: msg.x, y: msg.y, n } as const];
        return this.step(() => {
          if (n === 1)
            this.show({ ...asLocal(fixture("secret2-cuegiver")), clues: v.clues, stones });
          else this.show({ ...asLocal(fixture("reveal")), clues: v.clues, stones });
        });
      }
      case "round.next":
        if (phase !== "REVEAL") throw fromCode("WRONG_PHASE");
        return this.step(() => this.show(asLocal(fixture("gameover"))));
      case "pause.set":
        return this.step(() => this.show({ ...v, paused: msg.paused }));
      case "game.end":
        return this.step(() => this.show(asLocal(fixture("gameover"))));
      default:
        return;
    }
  }

  private grokMoves(n: 1 | 2) {
    this.emit({ type: "bot.status", seatId: "s3", state: "thinking" });
    this.later(() => {
      const v = this.view;
      if (!v) return;
      const spot = n === 1 ? { x: 6, y: 6 } : { x: 5, y: 3 };
      this.emit({ type: "bot.status", seatId: "s3", state: "idle" });
      this.emit({
        type: "bot.say",
        seatId: "s3",
        text: n === 1 ? "Złoty, ale nie z puszki. Biorę kratkę głębiej." : "Czyli rosół z piątku.",
      });
      this.show({ ...v, stones: [...v.stones, { seatId: "s3", ...spot, n }], turnSeatId: "s2" });
    }, BOT_MIN_THINK_MS);
  }

  private step(fn: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.later(() => {
        fn();
        resolve();
      });
    });
  }

  private show(view: PlayerView) {
    this.view = view;
    this.emit({ type: "view", seq: ++this.seq, view });
  }

  private emit(msg: ServerMessage) {
    if (this.open) this.h.onMessage(msg);
  }

  private later(fn: () => void, ms = this.delayMs) {
    this.timers.push(setTimeout(fn, ms));
  }
}

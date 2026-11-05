import { awardsFor, isColorWord } from "@tint/game-core";
import type { PlayerView, ServerMessage } from "@tint/protocol";
import type { PlaytestClient } from "./client";

/** Legal phase steps; staying in a phase is always fine, and game.end can jump to GAME_OVER. */
const NEXT: Record<string, string[]> = {
  LOBBY: ["SECRET_1"],
  SECRET_1: ["GUESS_1"],
  GUESS_1: ["SECRET_2"],
  SECRET_2: ["GUESS_2"],
  GUESS_2: ["REVEAL"],
  REVEAL: ["SECRET_1", "GAME_OVER"],
};

const words = (s: string) => s.split(/[^\p{L}]+/u).filter(Boolean);

/**
 * Checks the contract and the rules on every frame one connection receives. Collects human-readable
 * violations instead of throwing so a run reports everything it saw.
 */
export class Invariants {
  readonly violations: string[] = [];
  readonly stats = { views: 0, botSays: 0, grokFirstChecked: 0, awardsChecked: 0 };
  private lastSeq = -1;
  private lastPhase: string | undefined;
  private gameOver = false;

  constructor(readonly label: string) {}

  attach(client: PlaytestClient) {
    client.onFrame((f) => {
      if (!f.msg) {
        this.fail(`frame does not match the protocol: ${JSON.stringify(f.raw).slice(0, 120)}`);
        return;
      }
      this.onMessage(f.msg);
    });
    return this;
  }

  private fail(msg: string) {
    this.violations.push(`${this.label}: ${msg}`);
  }

  onMessage(m: ServerMessage) {
    if (m.type === "welcome") this.lastSeq = -1; // a fresh socket starts a new seq window
    if (m.type === "view") this.onView(m.seq, m.view);
    if (m.type === "bot.say") {
      this.stats.botSays++;
      if (words(m.text).some(isColorWord)) this.fail(`bot.say names a color: "${m.text}"`);
    }
    if (m.type === "grok.hint" && words(m.text).some(isColorWord)) {
      this.fail(`grok.hint names a color: "${m.text}"`);
    }
  }

  private onView(seq: number, v: PlayerView) {
    this.stats.views++;
    if (seq <= this.lastSeq) this.fail(`seq went ${this.lastSeq} → ${seq}`);
    this.lastSeq = seq;

    // 1. The secret goes only to the cue giver's seats, and everyone sees it in REVEAL.
    const cue = v.cueGiverSeatId !== null && v.you.includes(v.cueGiverSeatId);
    if (v.secret && v.phase !== "REVEAL" && !cue) this.fail(`secret leaked in ${v.phase}`);
    if (v.reveal && v.phase !== "REVEAL") this.fail(`reveal present in ${v.phase}`);

    // 3. Legal phase order.
    const entered = this.lastPhase !== undefined && v.phase !== this.lastPhase;
    if (this.lastPhase && v.phase !== this.lastPhase) {
      const ok = NEXT[this.lastPhase]?.includes(v.phase) || v.phase === "GAME_OVER";
      if (!ok) this.fail(`illegal phase step ${this.lastPhase} → ${v.phase}`);
    }
    this.lastPhase = v.phase;

    // 6. Stones sit on unique cells.
    const cells = new Set(v.stones.map((s) => `${s.x},${s.y}`));
    if (cells.size !== v.stones.length) this.fail(`two stones share a cell in ${v.phase}`);

    // 4. Grok moves first in each GUESS phase (when it is not the cue giver). Only judged on the
    // view that opens the phase, so a client that joined mid-phase doesn't produce a false alarm.
    const grok = v.seats.find((s) => s.kind === "grok");
    if (entered && (v.phase === "GUESS_1" || v.phase === "GUESS_2") && grok) {
      if (grok.id !== v.cueGiverSeatId) {
        this.stats.grokFirstChecked++;
        if (v.turnSeatId !== grok.id) {
          this.fail(`${v.phase} round ${v.round}: ${v.turnSeatId} moves before Grok`);
        }
      }
    }

    // 5. REVEAL awards match the scoring rules.
    if (v.phase === "REVEAL" && v.reveal && v.cueGiverSeatId) {
      this.stats.awardsChecked++;
      const want = awardsFor(
        { target: v.reveal.target, stones: v.stones, cueGiverSeatId: v.cueGiverSeatId },
        v.seats.map((s) => s.id),
      );
      if (JSON.stringify(want) !== JSON.stringify(v.reveal.awards)) {
        this.fail(`awards differ from awardsFor: ${JSON.stringify(v.reveal.awards)}`);
      }
    }
    if (v.phase === "GAME_OVER") this.gameOver = true;
  }

  /** 7. Call when the run ends: the game must have reached GAME_OVER. */
  finish() {
    if (!this.gameOver) this.fail(`never reached GAME_OVER (last phase ${this.lastPhase})`);
    return this.violations;
  }
}

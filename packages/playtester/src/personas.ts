import { validateClue } from "@tint/game-core";
import { BOARD_COLS, BOARD_ROWS, type Lang, type PlayerView } from "@tint/protocol";
import { type PlaytestClient, sleep } from "./client";

export type PersonaName = "casual" | "speedy" | "flaky";
export type Persona = {
  name: PersonaName;
  /** Milliseconds a player "thinks" before acting. */
  think: () => number;
  /** Reconnects and retransmits cids at random: a bad mobile network. */
  flaky: boolean;
};

const between = (lo: number, hi: number) => () => lo + Math.random() * (hi - lo);
export const PERSONAS: Record<PersonaName, Persona> = {
  casual: { name: "casual", think: between(1000, 4000), flaky: false },
  speedy: { name: "speedy", think: between(0, 60), flaky: false },
  flaky: { name: "flaky", think: between(200, 1500), flaky: true },
};

const CLUES: Record<Lang, string[]> = {
  pl: ["rosół", "sernik", "asfalt", "lato", "zima", "kawa", "poniedziałek", "motyl", "stary ser"],
  en: [
    "soup",
    "cheesecake",
    "asphalt",
    "summer",
    "winter",
    "coffee",
    "monday",
    "moth",
    "old cheese",
  ],
};

/** A clue that passes the same validator the server uses, so a rejection means a real bug. */
export function pickClue(phase: "SECRET_1" | "SECRET_2", lang: Lang): string {
  const pool = CLUES[lang].filter((w) => (phase === "SECRET_1" ? !w.includes(" ") : true));
  for (const w of pool.sort(() => Math.random() - 0.5)) {
    const r = validateClue(w, phase);
    if (r.ok) return r.text;
  }
  throw new Error("no valid clue in the pool");
}

/** A random free cell. ponytail: no hue reasoning, scores are irrelevant to a smoke run. */
export function pickCell(v: PlayerView): { x: number; y: number } {
  const taken = new Set(v.stones.map((s) => `${s.x},${s.y}`));
  for (;;) {
    const x = Math.floor(Math.random() * BOARD_COLS);
    const y = Math.floor(Math.random() * BOARD_ROWS);
    if (!taken.has(`${x},${y}`)) return { x, y };
  }
}

export type DriveOptions = {
  /** This connection starts the game (once everyone is seated) and advances rounds. */
  host: boolean;
  /** Seats to wait for before starting. */
  seatCount: number;
};

/**
 * Plays the seats this connection controls: submits clues, places stones, and (host) starts the
 * game and advances rounds. Resolves with `false` if GAME_OVER does not arrive in time.
 */
export function drive(
  client: PlaytestClient,
  persona: Persona,
  opts: DriveOptions,
  timeoutMs = 180_000,
): Promise<boolean> {
  let lastKey = "";
  let busy = false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    // Looks at the latest view; also re-run after an action, since views that arrived while busy
    // (e.g. during a reconnect) were skipped.
    const step = async () => {
      const v = client.view;
      if (!v || busy) return;
      if (v.phase === "GAME_OVER") {
        clearTimeout(timer);
        resolve(true);
        return;
      }
      const act = decide(v, opts);
      if (!act || act.key === lastKey) return;
      lastKey = act.key;
      busy = true;
      try {
        await sleep(persona.think());
        const cid = crypto.randomUUID();
        await client.send(act.msg, cid);
        if (persona.flaky && Math.random() < 0.4) {
          const again = await client.send(act.msg, cid); // retransmit: must be acked, not re-applied
          if (again.type === "error") throw new Error(`duplicate cid rejected: ${again.code}`);
        }
        if (persona.flaky && Math.random() < 0.3) await client.reconnect();
      } finally {
        busy = false;
      }
      void step();
    };
    client.onFrame((f) => {
      if (f.msg?.type === "view") void step();
    });
    void step();
  });
}

type Act = { key: string; msg: Parameters<PlaytestClient["send"]>[0] };

function decide(v: PlayerView, opts: DriveOptions): Act | null {
  const mine = (id: string | null) => id !== null && v.you.includes(id);
  const lang = v.lang ?? "pl";
  if (v.phase === "LOBBY") {
    const seated = v.seats.filter((s) => s.platform !== null || s.kind === "grok").length;
    return opts.host && seated >= opts.seatCount
      ? { key: "start", msg: { type: "game.start" } }
      : null;
  }
  if ((v.phase === "SECRET_1" || v.phase === "SECRET_2") && mine(v.cueGiverSeatId)) {
    return {
      key: `${v.round}:${v.phase}`,
      msg: { type: "clue.submit", seatId: v.cueGiverSeatId, text: pickClue(v.phase, lang) },
    };
  }
  if ((v.phase === "GUESS_1" || v.phase === "GUESS_2") && mine(v.turnSeatId)) {
    return {
      key: `${v.round}:${v.phase}:${v.stones.length}`,
      msg: { type: "stone.place", seatId: v.turnSeatId, ...pickCell(v) },
    };
  }
  if (v.phase === "REVEAL" && opts.host) {
    return { key: `next:${v.round}`, msg: { type: "round.next" } };
  }
  return null;
}

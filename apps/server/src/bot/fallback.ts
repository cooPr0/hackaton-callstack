import {
  BOTTOM_ROW_L,
  chebyshev,
  columnHue,
  foldWord,
  rowLightness,
  START_HUE,
  TOP_ROW_L,
} from "@tint/game-core";
import { BOARD_COLS, BOARD_ROWS, type Cell, type Stone } from "@tint/protocol";

/**
 * Deterministic Grok stand-in: used when botMode is "fallback", when xAI fails or is over
 * budget, and to submit a clue for a human cue giver who timed out online. It must never
 * stall the game, so every clue passes validateClue and every guess is a free cell (tested).
 */

// [OKLCH hue°, light word, dark word]
const HUE_WORDS: [number, string, string][] = [
  [0, "flaming", "wino"],
  [30, "łosoś", "cegła"],
  [60, "morela", "rdza"],
  [90, "rosół", "miód"],
  [110, "cytryna", "musztarda"],
  [135, "pistacja", "oliwka"],
  [155, "groszek", "mech"],
  [180, "mięta", "butelka"],
  [210, "lód", "morze"],
  [240, "niebo", "dżinsy"],
  [270, "lawenda", "jagoda"],
  [300, "wrzos", "bakłażan"],
  [330, "landrynka", "burak"],
];
const LIGHT_L = 0.78;
const DARK_L = 0.46;

/** Folded keyword → [hue°, lightness]. Matched as a prefix, so inflections hit (rosołu, marchewką). */
const KEYWORDS = new Map<string, [number, number]>([
  ...HUE_WORDS.flatMap(([h, light, dark]): [string, [number, number]][] => [
    [foldWord(light), [h, LIGHT_L]],
    [foldWord(dark), [h, DARK_L]],
  ]),
  ...(
    [
      ["pomidor", 30, 0.6],
      ["krew", 25, 0.45],
      ["wisni", 10, 0.45],
      ["truskaw", 20, 0.6],
      ["marchew", 60, 0.65],
      ["dyni", 60, 0.65],
      ["slonc", 100, 0.82],
      ["banan", 105, 0.85],
      ["piasek", 85, 0.8],
      ["traw", 145, 0.65],
      ["las", 155, 0.42],
      ["lisc", 145, 0.6],
      ["ocean", 230, 0.45],
      ["basen", 215, 0.75],
      ["sliwk", 320, 0.4],
      ["kaw", 60, 0.4],
      ["czekolad", 50, 0.38],
      ["noc", 265, 0.36],
      ["snieg", 100, 0.88],
      ["tomato", 30, 0.6],
      ["grass", 145, 0.65],
      ["sky", 240, 0.8],
      ["sea", 220, 0.5],
      ["sun", 100, 0.8],
      ["blood", 25, 0.45],
      ["wine", 0, 0.4],
      ["lemon", 110, 0.85],
      ["coffee", 60, 0.4],
    ] as const
  ).map(([k, h, l]): [string, [number, number]] => [k, [h, l]]),
]);

const LINES = [
  "Biorę kratkę głębiej.",
  "Czyli rosół z piątku.",
  "Stawiam tu. Bez wahania.",
  "Czuję to w kościach.",
  "Hmm… tak, tutaj.",
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const hueDist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

const hueToX = (h: number) =>
  Math.round(((((h - START_HUE) % 360) + 360) % 360) / (360 / BOARD_COLS)) % BOARD_COLS;
const lightnessToY = (l: number) =>
  clamp(
    Math.round(((TOP_ROW_L - l) / (TOP_ROW_L - BOTTOM_ROW_L)) * (BOARD_ROWS - 1)),
    0,
    BOARD_ROWS - 1,
  );

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ (c.codePointAt(0) ?? 0), 16777619);
  return h >>> 0;
}

/** Closest free cell by Chebyshev ring, scanning row-major inside each ring. */
export function nearestFree(c: Cell, stones: Cell[]): Cell {
  const taken = new Set(stones.map((s) => `${s.x},${s.y}`));
  for (let d = 0; d < BOARD_COLS; d++) {
    for (let y = c.y - d; y <= c.y + d; y++) {
      for (let x = c.x - d; x <= c.x + d; x++) {
        const cell = { x, y };
        if (x < 0 || y < 0 || x >= BOARD_COLS || y >= BOARD_ROWS) continue;
        if (chebyshev(cell, c) === d && !taken.has(`${x},${y}`)) return cell;
      }
    }
  }
  throw new Error("board full"); // unreachable: ≤ 6 seats × 2 stones on 288 cells
}

/** Where the clues point: the latest matching keyword wins (SECRET_2 refines SECRET_1). */
export function aimFor(clues: string[]): Cell {
  const words = clues
    .flatMap((c) => c.split(" "))
    .map(foldWord)
    .reverse();
  for (const w of words) {
    for (const [k, [h, l]] of KEYWORDS)
      if (w.startsWith(k)) return { x: hueToX(h), y: lightnessToY(l) };
  }
  return { x: hash(words.join(" ")) % BOARD_COLS, y: Math.floor(BOARD_ROWS / 2) };
}

export function fallbackGuess(clues: string[], stones: Stone[], rand = Math.random) {
  const aim = aimFor(clues);
  const jitter = () => Math.floor(rand() * 3) - 1;
  const noisy = {
    x: clamp(aim.x + jitter(), 0, BOARD_COLS - 1),
    y: clamp(aim.y + jitter(), 0, BOARD_ROWS - 1),
  };
  const line = LINES[Math.floor(rand() * LINES.length)] ?? "Hmm… tak, tutaj.";
  return { ...nearestFree(noisy, stones), line };
}

/** A clue for `target`: a hue-bucket word in SECRET_1, a light/shade hint in SECRET_2. */
export function fallbackClue(target: Cell, phase: "SECRET_1" | "SECRET_2"): string {
  const light = rowLightness(target.y) >= 0.62;
  if (phase === "SECRET_2") return light ? "w słońcu" : "w cieniu";
  const h = columnHue(target.x);
  let best = HUE_WORDS[0] as (typeof HUE_WORDS)[number];
  for (const hw of HUE_WORDS) if (hueDist(hw[0], h) < hueDist(best[0], h)) best = hw;
  return light ? best[1] : best[2];
}

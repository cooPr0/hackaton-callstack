import { isColorWord, validateClue } from "@tint/game-core";
import { BOARD_COLS, BOARD_ROWS, type Cell, type Lang, type Stone } from "@tint/protocol";
import { nearestFree } from "./fallback";
import {
  CLUE_SCHEMA,
  cluePrompt,
  defendPrompt,
  GUESS_SCHEMA,
  guessPrompt,
  LINE_SCHEMA,
} from "./prompts";
import { chatJson } from "./xai";

/**
 * Grok's moves via xAI. Every function returns null when xAI is unavailable, over budget or
 * returns something unusable; the room then plays the fallback. Model output is never trusted:
 * cells are snapped to a free cell, clues pass validateClue, lines are filtered.
 */
export interface GrokEnv {
  XAI_API_KEY?: string;
  XAI_BASE_URL?: string;
  XAI_MODEL_FAST?: string;
  XAI_MODEL_SMART?: string;
}

/** Defaults until xai-probe measurements say otherwise (see docs/PROTOCOL.md v1.1 plan). */
export const DEFAULT_MODELS = { fast: "grok-4.20-0309-non-reasoning", smart: "grok-4.7" } as const;
export const DEADLINE_MS = { guess: 5_000, clue: 12_000, defend: 6_000 } as const;
const CLUE_ATTEMPTS = 3;

/** Asks the room's budget for one more xAI call. */
export type Budget = () => boolean;

const cfg = (env: GrokEnv) => ({ apiKey: env.XAI_API_KEY, baseUrl: env.XAI_BASE_URL });
const models = (env: GrokEnv) => ({
  fast: env.XAI_MODEL_FAST || DEFAULT_MODELS.fast,
  smart: env.XAI_MODEL_SMART || DEFAULT_MODELS.smart,
});
const enabled = (env: GrokEnv) => Boolean(env.XAI_API_KEY);

/** A line players will read/hear: printable, ≤ 200 chars, no color words, no digits. */
export function cleanLine(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.replace(/\p{C}/gu, "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!s || /\d/.test(s)) return undefined;
  const words = s.split(/[^\p{L}]+/u).filter(Boolean);
  return words.some(isColorWord) ? undefined : s;
}

const inBounds = (n: unknown, max: number): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < max;

export async function grokGuess(
  env: GrokEnv,
  input: { clues: string[]; stones: Stone[]; lang: Lang },
  budget: Budget,
): Promise<{ x: number; y: number; line?: string } | null> {
  if (!enabled(env) || !budget()) return null;
  const p = guessPrompt(input);
  const out = (await chatJson(cfg(env), {
    task: "guess",
    model: models(env).fast,
    ...p,
    schemaName: "guess",
    schema: GUESS_SCHEMA,
    deadlineMs: DEADLINE_MS.guess,
  })) as { x?: unknown; y?: unknown; line?: unknown } | null;
  if (!out || typeof out !== "object") return null;
  const aim: Cell = {
    x: inBounds(out.x, BOARD_COLS)
      ? out.x
      : Math.min(BOARD_COLS - 1, Math.max(0, Math.round(Number(out.x) || 0))),
    y: inBounds(out.y, BOARD_ROWS)
      ? out.y
      : Math.min(BOARD_ROWS - 1, Math.max(0, Math.round(Number(out.y) || 0))),
  };
  const cell = nearestFree(aim, input.stones);
  const line = cleanLine(out.line);
  return line ? { ...cell, line } : cell;
}

export async function grokClue(
  env: GrokEnv,
  input: {
    target: Cell;
    phase: "SECRET_1" | "SECRET_2";
    clues: string[];
    stones: Stone[];
    lang: Lang;
  },
  budget: Budget,
): Promise<string | null> {
  if (!enabled(env)) return null;
  const until = Date.now() + DEADLINE_MS.clue;
  const p = cluePrompt(input);
  for (let i = 0; i < CLUE_ATTEMPTS; i++) {
    const left = until - Date.now();
    if (left < 500 || !budget()) return null;
    const out = (await chatJson(cfg(env), {
      task: "clue",
      // The reasoning model answers in ~15 s (probe, Nov 2026): too slow while the table waits.
      model: models(env).fast,
      ...p,
      schemaName: "clue",
      schema: CLUE_SCHEMA,
      deadlineMs: left,
    })) as { word?: unknown } | null;
    if (typeof out?.word !== "string") continue;
    const v = validateClue(out.word, input.phase);
    if (v.ok) return v.text;
  }
  return null;
}

export async function grokDefend(
  env: GrokEnv,
  input: { target: Cell; clues: string[]; grokStones: Stone[]; grokPoints: number; lang: Lang },
  budget: Budget,
): Promise<string | null> {
  if (!enabled(env) || !budget()) return null;
  const out = (await chatJson(cfg(env), {
    task: "defend",
    model: models(env).fast,
    ...defendPrompt(input),
    schemaName: "line",
    schema: LINE_SCHEMA,
    deadlineMs: DEADLINE_MS.defend,
  })) as { line?: unknown } | null;
  return cleanLine(out?.line) ?? null;
}

/** Sliding-window budget: at most `max` calls per `windowMs`. Mutates `calls` (persisted by the room). */
export function takeCall(calls: number[], now: number, max = 30, windowMs = 10 * 60_000): boolean {
  while (calls.length && (calls[0] as number) <= now - windowMs) calls.shift();
  if (calls.length >= max) return false;
  calls.push(now);
  return true;
}

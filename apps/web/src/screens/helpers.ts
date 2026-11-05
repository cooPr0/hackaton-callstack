import type { PlayerView } from "@tint/protocol";
import { CLUE_MAX_CHARS, CLUE_MAX_WORDS } from "@tint/protocol";
import type { Posture } from "../app/types";
import { type Copy, getCopy } from "../i18n";

/**
 * Local pass-and-play held "closed" (F key / fold pill) is fold emulation: on a wide window
 * ClosedLayout draws the screen inside a phone frame instead of stretching it.
 * Online screens never get the frame — there posture only picks the table layout.
 */
export const isFoldEmulation = (view: PlayerView | null, posture: Posture): boolean =>
  !!view?.local && posture === "closed";

/**
 * Pure display helpers for the closed screens. No game rules here: the clue check is only a
 * friendly pre-check (the server validator, incl. the colour-word list, is authoritative).
 */

export type ClueCheck = { ok: true; clue: string } | { ok: false; message: string };

/** Collapse runs of whitespace and trim, the way the clue will be sent. */
export const normalizeClue = (text: string): string => text.replace(/\s+/g, " ").trim();

/** Letters (any script) and spaces only, ≤ CLUE_MAX_CHARS, word count for the phase. */
export function checkClue(
  text: string,
  phase: "SECRET_1" | "SECRET_2",
  t: Copy = getCopy(),
): ClueCheck {
  const clue = normalizeClue(text);
  if (!clue) return { ok: false, message: t.clueErrors.empty };
  if (!/^[\p{L} ]+$/u.test(clue)) return { ok: false, message: t.clueErrors.letters };
  if (clue.length > CLUE_MAX_CHARS)
    return { ok: false, message: t.clueErrors.tooLong(CLUE_MAX_CHARS) };
  const words = clue.split(" ").length;
  if (words > CLUE_MAX_WORDS[phase]) {
    return {
      ok: false,
      message: phase === "SECRET_1" ? t.clueErrors.oneWord : t.clueErrors.twoWords,
    };
  }
  return { ok: true, clue };
}

export interface RankedScore {
  id: string;
  name: string;
  kind: "human" | "grok";
  score: number;
}

/** Seats by score, highest first; ties keep seat order (the design's "Ola 10 · Grok 8 · Kuba 6"). */
export function rankedScores(view: PlayerView): RankedScore[] {
  return view.seats
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.kind === "grok" || s.platform !== null || s.score > 0)
    .sort((a, b) => b.s.score - a.s.score || a.i - b.i)
    .map(({ s }) => ({ id: s.id, name: s.name, kind: s.kind, score: s.score }));
}

export type Winner = { kind: "winner"; id: string; name: string } | { kind: "tie" } | null;

/** Highest score wins; a shared top score is a tie. Null when nobody is seated. */
export function winnerOf(view: PlayerView): Winner {
  const [first, second] = rankedScores(view);
  if (!first) return null;
  if (second && second.score === first.score) return { kind: "tie" };
  return { kind: "winner", id: first.id, name: first.name };
}

/** "Ola 7, Grok 6, Kuba 5" for the pause sheet. */
export const scoresInline = (view: PlayerView): string =>
  rankedScores(view)
    .map((s) => `${s.name} ${s.score}`)
    .join(", ");

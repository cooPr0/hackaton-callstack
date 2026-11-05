import { CLUE_MAX_CHARS, CLUE_MAX_WORDS } from "@tint/protocol";

export type ClueResult =
  | { ok: true; text: string }
  | { ok: false; code: "INVALID_CLUE" | "COLOR_WORD" };

/** Lowercase and strip diacritics. "ł" doesn't decompose under NFD, so it's mapped by hand. */
export const foldWord = (w: string) =>
  w.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l");

// Long stems are unambiguous: any word starting with one is a color word (czerwonawy, zielonkawego…).
const COLOR_PREFIX = [
  "czerwon",
  "zielon",
  "niebiesk",
  "zolt",
  "zlot",
  "zloc",
  "pomarancz",
  "fiolet",
  "rozow",
  "brazow",
  "purpur",
  "bordow",
  "turkus",
  "blekit",
  "seledyn",
  "karmazyn",
  "szkarlat",
  "indyg",
  "lazur",
  "granatow",
  "grafitow",
  "oliwkow",
  "limonkow",
  "miedzian",
  "srebr",
  "amarant",
  "magent",
  "cyjan",
  "yellow",
  "orange",
  "purple",
  "violet",
  "magenta",
  "turquoise",
  "crimson",
  "scarlet",
  "maroon",
  "indigo",
  "silver",
  "golden",
  "colou?r",
  "kolor",
].map((p) => new RegExp(`^${p}`));
// Short stems collide with real words (szarlotka, białko, rudera, kremówka, redwood), so they
// only match with adjective/derivation endings.
const COLOR_EXACT =
  /^(?:(?:szar|bial|czarn|rud|siw|bezow|kremow|bur)(?:y|a|e|ego|emu|ym|ej|ych|ymi|o|aw\p{L}*|osc\p{L}*)|(?:red|green|blue|pink|brown|black|white|gr[ae]y|cyan|teal|navy|beige|gold|lime)(?:s|ish|dish|ness|dness|er|der|est|dest)?)$/u;
const LETTERS_AND_SINGLE_SPACES = /^\p{L}+(?: \p{L}+)*$/u;

export const isColorWord = (w: string) => {
  const f = foldWord(w);
  return COLOR_PREFIX.some((re) => re.test(f)) || COLOR_EXACT.test(f);
};

/** SECRET_1: exactly 1 word. SECRET_2: 1–2 words. Letters and single spaces, ≤ 24 chars, no color names. */
export function validateClue(text: string, phase: keyof typeof CLUE_MAX_WORDS): ClueResult {
  const t = text.trim();
  if (t.length === 0 || t.length > CLUE_MAX_CHARS || !LETTERS_AND_SINGLE_SPACES.test(t)) {
    return { ok: false, code: "INVALID_CLUE" };
  }
  const words = t.split(" ");
  if (words.length > CLUE_MAX_WORDS[phase]) return { ok: false, code: "INVALID_CLUE" };
  if (words.some(isColorWord)) return { ok: false, code: "COLOR_WORD" };
  return { ok: true, text: t };
}

/**
 * Board geometry and game constants shared by server, web, iOS (mirrored in TintKit) and playtester.
 * Coordinates: x = column 0..23 (left → right), y = row 0..11 (top → bottom). Never shown in UI.
 */
export const PROTOCOL_VERSION = 1 as const;

export const BOARD_COLS = 24;
export const BOARD_ROWS = 12;
export const BOARD_CELLS = BOARD_COLS * BOARD_ROWS; // 288

/** The hinge falls in the grout between column HINGE_AFTER_X and HINGE_AFTER_X + 1 (x 11 | x 12). */
export const HINGE_AFTER_X = 11;

/** Cue-giver viewfinder: 7 columns × 9 rows, clamped to the board edges. */
export const VIEWFINDER_W = 7;
export const VIEWFINDER_H = 9;

/** Scoring by Chebyshev distance from the target: 0 → 3, ≤1 → 2, ≤2 → 1. */
export const SCORE_BY_DISTANCE = [3, 2, 1] as const;
/** Cue giver earns +1 for every stone within this Chebyshev radius (3 × 3 "house"). */
export const CUE_GIVER_HOUSE_RADIUS = 1;

export const DEFAULT_ROUNDS = 6;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 12;
export const MAX_SEATS = 6;

export const CLUE_MAX_CHARS = 24;
/** Max words per clue phase: SECRET_1 → 1 word, SECRET_2 → 1..2 words. */
export const CLUE_MAX_WORDS = { SECRET_1: 1, SECRET_2: 2 } as const;

export const ONLINE_TURN_TIMEOUT_MS = 60_000;
export const BOT_MIN_THINK_MS = 1_200;
export const BOT_TIMEOUT_MS = 8_000;
export const PING_INTERVAL_MS = 20_000;

/** Unambiguous alphabet for 5-char room codes (no I, L, O, 0, 1). */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 5;

/** Brand tokens (see design/Tint-and-Tell.pdf p.2, p.6). */
export const COLORS = {
  coldSteel: "#F8F7F4", // light background / dark-mode text
  cocoaSpice: "#191815", // dark background / light-mode text
  roundGold: "#E9B005", // left T of the logo, "&"
} as const;

export const MODES = ["stol", "ty", "grok"] as const;

export const PHASES = [
  "LOBBY",
  "SECRET_1",
  "GUESS_1",
  "SECRET_2",
  "GUESS_2",
  "REVEAL",
  "GAME_OVER",
] as const;

export const SEAT_KINDS = ["human", "grok"] as const;

export const PLATFORMS = ["ios", "web", "bot"] as const;

/** Room language: Grok's prompts, fallback words, speech and voice follow it. Default "pl". */
export const LANGS = ["pl", "en"] as const;
export const DEFAULT_LANG = "pl" as const;

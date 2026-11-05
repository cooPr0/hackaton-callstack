import { BOARD_COLS, BOARD_ROWS, COLORS } from "@tint/protocol";
import { clampChroma, formatHex, type Oklch, oklch } from "culori";

/**
 * The 24 × 12 board.
 * - Columns: hue sweeps 360° in OKLCH, starting at warm red.
 * - Rows: lightness from TOP_ROW_L (0.88, per the PDF contrast study) down to BOTTOM_ROW_L.
 * - Chroma: requested high, then clamped to the sRGB gamut (keeps L and h), so the top row
 *   naturally becomes pastel and the bottom rows deep.
 * The generated file `shared/palette.json` is the single source of truth for every client.
 */
export const TOP_ROW_L = 0.88;
export const BOTTOM_ROW_L = 0.34;
export const START_HUE = 20;
export const TARGET_CHROMA = 0.22;

export interface PaletteCell {
  x: number;
  y: number;
  hex: string;
  /** OKLCH of the gamut-mapped color, rounded to 3 decimals (h in degrees, 1 decimal). */
  L: number;
  C: number;
  h: number;
  /** Plain-English description for the bot prompt only. Never shown to players. */
  descriptor: string;
}

export interface Palette {
  version: 1;
  cols: number;
  rows: number;
  topRowL: number;
  bottomRowL: number;
  cells: PaletteCell[]; // row-major: index = y * cols + x
}

const HUE_NAMES: [number, string][] = [
  [10, "pink-red"],
  [30, "red"],
  [50, "red-orange"],
  [70, "orange"],
  [85, "amber"],
  [100, "golden yellow"],
  [115, "yellow"],
  [130, "chartreuse"],
  [150, "green"],
  [170, "emerald"],
  [190, "teal"],
  [215, "cyan"],
  [240, "azure"],
  [265, "blue"],
  [285, "indigo"],
  [305, "violet"],
  [325, "purple"],
  [345, "magenta"],
  [361, "pink-red"],
];

export function hueName(h: number): string {
  const hh = ((h % 360) + 360) % 360;
  for (const [limit, name] of HUE_NAMES) if (hh < limit) return name;
  return "pink-red";
}

export function lightnessName(L: number): string {
  if (L >= 0.85) return "very light";
  if (L >= 0.75) return "light";
  if (L >= 0.65) return "medium-light";
  if (L >= 0.55) return "medium";
  if (L >= 0.45) return "medium-dark";
  if (L >= 0.38) return "dark";
  return "very dark";
}

function chromaName(C: number): string {
  if (C < 0.05) return "muted";
  if (C < 0.1) return "soft";
  if (C < 0.16) return "rich";
  return "vivid";
}

export function describe(L: number, C: number, h: number): string {
  return `${lightnessName(L)} ${chromaName(C)} ${hueName(h)}`;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function rowLightness(y: number, rows = BOARD_ROWS): number {
  return TOP_ROW_L + ((BOTTOM_ROW_L - TOP_ROW_L) * y) / (rows - 1);
}

export function columnHue(x: number, cols = BOARD_COLS): number {
  return (START_HUE + (360 * x) / cols) % 360;
}

export function generatePalette(): Palette {
  const cells: PaletteCell[] = [];
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const requested: Oklch = {
        mode: "oklch",
        l: rowLightness(y),
        c: TARGET_CHROMA,
        h: columnHue(x),
      };
      const mapped = clampChroma(requested, "oklch", "rgb") as Oklch;
      const hex = formatHex(mapped);
      const actual = oklch(hex) as Oklch;
      const L = round(actual.l, 3);
      const C = round(actual.c, 3);
      const h = round(actual.h ?? columnHue(x), 1);
      cells.push({ x, y, hex, L, C, h, descriptor: describe(L, C, h) });
    }
  }
  return {
    version: 1,
    cols: BOARD_COLS,
    rows: BOARD_ROWS,
    topRowL: TOP_ROW_L,
    bottomRowL: BOTTOM_ROW_L,
    cells,
  };
}

/** Euclidean distance in OKLab (ΔE_OK). */
export function deltaEOK(hexA: string, hexB: string): number {
  const a = oklch(hexA) as Oklch;
  const b = oklch(hexB) as Oklch;
  const toLab = (c: Oklch) => {
    const hr = ((c.h ?? 0) * Math.PI) / 180;
    return [c.l, c.c * Math.cos(hr), c.c * Math.sin(hr)] as const;
  };
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Closest board cell to a background color — the PDF requires ≥ 0.06 (no cell "melts" into the bg). */
export function nearestCellDistance(palette: Palette, bgHex: string): number {
  return Math.min(...palette.cells.map((c) => deltaEOK(c.hex, bgHex)));
}

export const BACKGROUNDS = { light: COLORS.coldSteel, dark: COLORS.cocoaSpice } as const;

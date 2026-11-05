import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BACKGROUNDS, generatePalette, nearestCellDistance } from "../src/palette";

const out = fileURLToPath(new URL("../../../shared/palette.json", import.meta.url));
const palette = generatePalette();

// Compact: one cell per line keeps diffs readable.
const body = palette.cells.map((c) => `    ${JSON.stringify(c)}`).join(",\n");
const { cells: _cells, ...meta } = palette;
const head = JSON.stringify(meta, null, 2).replace(/\n}$/, "");
writeFileSync(out, `${head},\n  "cells": [\n${body}\n  ]\n}\n`);

console.log(`wrote ${palette.cells.length} cells → ${out}`);
console.log(
  `nearest ΔE_OK to light bg ${BACKGROUNDS.light}: ${nearestCellDistance(palette, BACKGROUNDS.light).toFixed(3)}`,
);
console.log(
  `nearest ΔE_OK to dark  bg ${BACKGROUNDS.dark}: ${nearestCellDistance(palette, BACKGROUNDS.dark).toFixed(3)}`,
);

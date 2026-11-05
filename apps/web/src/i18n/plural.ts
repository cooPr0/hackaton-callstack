/**
 * Polish plural: forms = [one, few, many], e.g. ["kamień", "kamienie", "kamieni"].
 * 1 → one; 2–4 (but not 12–14) → few; everything else → many.
 */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms[0];
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
}

export const pluralN = (n: number, forms: readonly [string, string, string]) =>
  `${n} ${plural(n, forms)}`;

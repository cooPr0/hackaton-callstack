/**
 * One mulberry32 step → [float in [0, 1), next seed]. The seed lives in GameState, so target
 * picks are deterministic in tests and survive DO hibernation. The server seeds it from
 * crypto.getRandomValues and never sends it to clients.
 */
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), s | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

import {
  type Award,
  type Cell,
  CUE_GIVER_HOUSE_RADIUS,
  SCORE_BY_DISTANCE,
  type Stone,
} from "@tint/protocol";

export const chebyshev = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const REASONS = ["exact", "near", "far"] as const;

/** Points and reason for one stone, or null when it scores nothing. */
export function scoreStone(target: Cell, stone: Cell): Pick<Award, "delta" | "reason"> | null {
  const d = chebyshev(target, stone);
  const delta = SCORE_BY_DISTANCE[d];
  const reason = REASONS[d];
  return delta && reason ? { delta, reason } : null;
}

/**
 * Awards in seat order, then stone order, then one aggregated `house` entry for the cue giver
 * (+1 per stone inside the 3 × 3). Matches shared/fixtures/views/reveal.json.
 */
export function awardsFor(
  round: { target: Cell; stones: Stone[]; cueGiverSeatId: string },
  seatOrder: string[],
): Award[] {
  const awards: Award[] = [];
  for (const seatId of seatOrder) {
    for (const s of round.stones) {
      if (s.seatId !== seatId) continue;
      const a = scoreStone(round.target, s);
      if (a) awards.push({ seatId, ...a });
    }
  }
  const house = round.stones.filter(
    (s) => chebyshev(round.target, s) <= CUE_GIVER_HOUSE_RADIUS,
  ).length;
  if (house > 0) awards.push({ seatId: round.cueGiverSeatId, delta: house, reason: "house" });
  return awards;
}

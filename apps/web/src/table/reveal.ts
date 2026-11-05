import type { Cell, PlayerView } from "@tint/protocol";
import { roundDeltas } from "../app/roles";
import { rankedScores } from "../screens/helpers";
import { zone } from "./geometry";

/**
 * Reveal display helpers. Points come from the server's `reveal.awards`; the client never
 * scores. `zone` is only used to pin each award to the stone it was given for.
 */

const STONE_REASONS = new Set(["exact", "near", "far"]);

/**
 * PRIVACY: the only target the table may draw. It comes from the public `reveal` block and
 * only in REVEAL — never from `secret`, even when a local device holds it.
 */
export const revealTargetOf = (view: PlayerView): Cell | null =>
  view.phase === "REVEAL" ? (view.reveal?.target ?? null) : null;

/**
 * Badge text per stone index in `view.stones` ("+3"), in placement order.
 * An award (seat, reason) is matched to that seat's not-yet-used stone in the same zone.
 */
export function stoneBadges(view: PlayerView): Map<number, string> {
  const out = new Map<number, string>();
  const target = revealTargetOf(view);
  if (!target) return out;
  const used = new Set<number>();
  for (const award of view.reveal?.awards ?? []) {
    if (!STONE_REASONS.has(award.reason)) continue;
    const i = view.stones.findIndex(
      (s, idx) =>
        !used.has(idx) && s.seatId === award.seatId && zone(s.x, s.y, target) === award.reason,
    );
    if (i < 0) continue;
    used.add(i);
    out.set(i, `+${award.delta}`);
  }
  return out;
}

/** "Ola +4 · Grok +3 · Kuba +2", in the same order as the scores. */
export function deltasLine(view: PlayerView): string {
  const deltas = roundDeltas(view);
  return rankedScores(view)
    .map((s) => `${s.name} +${deltas[s.id] ?? 0}`)
    .join(" · ");
}

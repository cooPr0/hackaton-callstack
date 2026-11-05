import type { Mode, SeatKind } from "@tint/protocol";
import { DEFAULT_ROUNDS, MAX_ROUNDS, MAX_SEATS, MIN_ROUNDS } from "@tint/protocol";
import type { SetupForm } from "../store/game";

export interface Player {
  name: string;
  kind: SeatKind;
}

export const DEFAULT_PLAYERS: Player[] = [
  { name: "Kuba", kind: "human" },
  { name: "Ola", kind: "human" },
  { name: "Grok", kind: "grok" },
];

export const MAX_HUMANS = MAX_SEATS - 1; // one seat is always Grok

export const clampRounds = (n: number) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(n)));

/** Humans first (in order), Grok last — the order cue givers rotate in. */
export function normalizePlayers(
  players: Player[],
  placeholder: (i: number) => string = (i) => `Gracz ${i}`,
): Player[] {
  const humans = players
    .filter((p) => p.kind === "human")
    .slice(0, MAX_HUMANS)
    .map((p, i) => ({
      kind: "human" as const,
      name: p.name.trim().slice(0, 24) || placeholder(i + 1),
    }));
  return [...humans, { name: "Grok", kind: "grok" }];
}

/** Who draws the first shade — shown on the start button ("Losuj odcień dla Kuby"). */
export function firstCueGiver(mode: Mode, players: Player[]): string {
  if (mode === "grok") return "Grok";
  return normalizePlayers(players)[0]?.name ?? "";
}

/** Each mode needs at least one human; "stół" needs two so someone can guess besides Grok. Returns a copy key. */
export function validate(mode: Mode, players: Player[]): "needOne" | "needTwo" | null {
  const humans = players.filter((p) => p.kind === "human").length;
  if (humans < 1) return "needOne";
  if (mode === "stol" && humans < 2) return "needTwo";
  return null;
}

export function toForm(
  mode: Mode,
  rounds: number,
  local: boolean,
  players: Player[],
  placeholder?: (i: number) => string,
): SetupForm {
  const seats = normalizePlayers(players, placeholder);
  return {
    mode,
    rounds: clampRounds(rounds),
    local,
    players: seats,
    hostName: seats[0]?.name ?? "Gracz 1",
  };
}

export { DEFAULT_ROUNDS };

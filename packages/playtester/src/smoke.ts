import type { Lang } from "@tint/protocol";
import { createRoom, joinRoom, PlaytestClient } from "./client";
import { Invariants } from "./invariants";
import { drive, PERSONAS, type PersonaName } from "./personas";
import { grokStats, type Report } from "./report";

export type SmokeOptions = {
  base: string;
  mode?: "stol" | "ty" | "grok";
  /** Human seats (Grok is added). */
  players?: number;
  rounds?: number;
  persona?: PersonaName;
  /** One socket controlling every human seat (pass-and-play). */
  local?: boolean;
  realGrok?: boolean;
  lang?: Lang;
  timeoutMs?: number;
};

const NAMES = ["Ola", "Kuba", "Marta", "Piotr", "Ewa"];

/** Plays one full game with fake humans and checks the invariants on every connection. */
export async function runSmoke(o: SmokeOptions): Promise<Report> {
  const mode = o.mode ?? "stol";
  const players = o.players ?? 3;
  const rounds = o.rounds ?? 1;
  const persona = PERSONAS[o.persona ?? "speedy"];
  const local = o.local ?? false;
  const started = Date.now();
  const report = (violations: string[], clients: PlaytestClient[]): Report => ({
    ok: violations.length === 0,
    base: o.base,
    mode,
    persona: persona.name,
    local,
    realGrok: !!o.realGrok,
    rounds,
    players,
    durationMs: Date.now() - started,
    grok: grokStats(clients[0]?.frames ?? []),
    violations,
  });

  const seats = [
    ...Array.from({ length: players }, (_, i) => ({
      name: i === 0 ? "Host" : (NAMES[(i - 1) % NAMES.length] ?? `P${i}`),
      kind: "human" as const,
    })),
    { name: "Grok", kind: "grok" as const },
  ];
  const created = await createRoom(o.base, {
    mode,
    rounds,
    local,
    platform: "web",
    botMode: o.realGrok ? "grok" : "fallback",
    seats,
    lang: o.lang ?? "pl",
  });
  if (created.status !== 200 || !created.body.code) {
    return report([`create room failed: ${created.status} ${JSON.stringify(created.body)}`], []);
  }
  const code = created.body.code;
  const credentials = created.body.seats;

  const clients: PlaytestClient[] = [];
  if (local) {
    clients.push(
      new PlaytestClient(
        "device",
        o.base,
        code,
        credentials.map((s) => s.token),
        "ios",
      ),
    );
  } else {
    clients.push(new PlaytestClient("host", o.base, code, [credentials[0]?.token ?? ""]));
    for (const s of seats.slice(1, players)) {
      const j = await joinRoom(o.base, code, s.name, "ios");
      if (j.status !== 200) return report([`join ${s.name} failed: ${j.status}`], clients);
      clients.push(new PlaytestClient(s.name, o.base, code, [j.body.token], "ios"));
    }
  }

  const checks = clients.map((c) => new Invariants(c.label).attach(c));
  for (const c of clients) {
    if (!(await c.open())) return report([`${c.label}: socket refused (${c.closeCode})`], clients);
  }
  const done = await Promise.all(
    clients.map((c, i) =>
      drive(c, persona, { host: i === 0, seatCount: seats.length }, o.timeoutMs),
    ),
  );
  for (const c of clients) c.close();

  const violations = checks.flatMap((inv) => inv.finish());
  if (done.includes(false)) violations.push("timed out before GAME_OVER");
  const seen = new Set<string>();
  return report(
    violations.filter((v) => !seen.has(v) && seen.add(v)),
    clients,
  );
}

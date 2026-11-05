import type { Frame } from "./client";

export type Report = {
  ok: boolean;
  base: string;
  mode: string;
  persona: string;
  local: boolean;
  realGrok: boolean;
  rounds: number;
  players: number;
  durationMs: number;
  /** Time from `bot.status thinking` to `idle`, per Grok move. */
  grok: { moves: number; p50: number | null; p95: number | null; degraded: boolean; lines: number };
  violations: string[];
};

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? null;
}

/** Grok's thinking times and degradation, read from one connection's frames. */
export function grokStats(frames: Frame[]): Report["grok"] {
  const times: number[] = [];
  let since: number | null = null;
  let degraded = false;
  let lines = 0;
  for (const f of frames) {
    const m = f.msg;
    if (!m) continue;
    if (m.type === "bot.status") {
      if (m.state === "thinking") since = f.at;
      else if (since !== null) {
        times.push(f.at - since);
        since = null;
      }
    }
    if (m.type === "bot.say") lines++;
    if (m.type === "view" && m.view.seats.some((s) => s.kind === "grok" && s.degraded)) {
      degraded = true;
    }
  }
  return {
    moves: times.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    degraded,
    lines,
  };
}

const ms = (n: number | null) => (n === null ? "–" : `${Math.round(n)} ms`);

export function formatText(r: Report): string {
  const g = r.grok;
  return [
    `${r.ok ? "PASS" : "FAIL"}  ${r.mode} · ${r.players} humans · ${r.rounds} round(s) · ${r.persona}${r.local ? " · local" : ""} · ${r.base}`,
    `  took ${(r.durationMs / 1000).toFixed(1)} s`,
    `  Grok: ${g.moves} moves, p50 ${ms(g.p50)}, p95 ${ms(g.p95)}, ${g.lines} lines, ${g.degraded ? "DEGRADED (fallback used)" : "no fallback"}${r.realGrok ? "" : " (fallback mode run)"}`,
    ...r.violations.map((v) => `  ✘ ${v}`),
  ].join("\n");
}

/** Body for a Discord webhook: one embed, green on pass, red on fail. */
export function discordEmbed(r: Report) {
  const g = r.grok;
  return {
    embeds: [
      {
        title: `${r.ok ? "✅" : "❌"} Playtest ${r.realGrok ? "(real Grok)" : "(fallback)"}`,
        color: r.ok ? 0x2ecc71 : 0xe74c3c,
        description: r.violations.slice(0, 8).join("\n").slice(0, 1500) || "All invariants held.",
        fields: [
          {
            name: "Game",
            value: `${r.mode}, ${r.players} humans, ${r.rounds} round(s)`,
            inline: true,
          },
          { name: "Took", value: `${(r.durationMs / 1000).toFixed(1)} s`, inline: true },
          { name: "Grok p50 / p95", value: `${ms(g.p50)} / ${ms(g.p95)}`, inline: true },
          { name: "Fallback used", value: g.degraded ? "yes" : "no", inline: true },
        ],
        footer: { text: r.base },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// pnpm playtest smoke  [--env local|prod] [--url URL] [--mode stol|ty|grok] [--players 3] [--rounds 1]
//                      [--persona casual|speedy|flaky] [--local] [--lang pl|en] [--real-grok] [--json]
// pnpm playtest fill <CODE> --count N [--env … | --url …] [--persona …]
// pnpm playtest attack [--env … | --url …]     runs apps/server/scripts/e2e.mjs (contract + abuse checks)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { joinRoom, PlaytestClient } from "./client";
import { drive, PERSONAS, type PersonaName } from "./personas";
import { discordEmbed, formatText } from "./report";
import { runSmoke } from "./smoke";

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    env: { type: "string", default: "local" },
    url: { type: "string" },
    mode: { type: "string", default: "stol" },
    players: { type: "string", default: "3" },
    rounds: { type: "string", default: "1" },
    persona: { type: "string", default: "speedy" },
    lang: { type: "string", default: "pl" },
    count: { type: "string", default: "1" },
    local: { type: "boolean", default: false },
    "real-grok": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    discord: { type: "boolean", default: false },
  },
});
const [cmd, arg] = positionals;

function baseUrl(): string {
  if (a.url) return a.url.replace(/\/$/, "");
  if (a.env === "local") return "http://localhost:8787";
  if (a.env === "prod" && process.env.PLAYTEST_PROD_URL) return process.env.PLAYTEST_PROD_URL;
  console.error("--env prod needs PLAYTEST_PROD_URL (or pass --url https://…)");
  process.exit(2);
}
const persona = (): PersonaName => {
  if (!(a.persona && a.persona in PERSONAS)) {
    console.error(`unknown persona ${a.persona}; use casual | speedy | flaky`);
    process.exit(2);
  }
  return a.persona as PersonaName;
};

async function main(): Promise<number> {
  const base = baseUrl();
  if (cmd === "smoke") {
    const r = await runSmoke({
      base,
      mode: a.mode as "stol" | "ty" | "grok",
      players: Number(a.players),
      rounds: Number(a.rounds),
      persona: persona(),
      local: a.local,
      realGrok: a["real-grok"],
      lang: a.lang as "pl" | "en",
    });
    console.log(a.json ? JSON.stringify(r) : formatText(r));
    if (a.discord) console.log(JSON.stringify(discordEmbed(r)));
    return r.ok ? 0 : 1;
  }
  if (cmd === "fill" && arg) {
    const code = arg.toUpperCase();
    const clients: Promise<boolean>[] = [];
    for (let i = 0; i < Number(a.count); i++) {
      const j = await joinRoom(base, code, `Bot${i + 1}`, "ios");
      if (j.status !== 200) {
        console.error(`join failed: ${j.status} ${JSON.stringify(j.body)}`);
        return 1;
      }
      const c = new PlaytestClient(`bot${i + 1}`, base, code, [j.body.token], "ios");
      if (!(await c.open())) return 1;
      console.log(`joined ${code} as ${c.seatIds.join()}`);
      clients.push(drive(c, PERSONAS[persona()], { host: false, seatCount: 0 }, 30 * 60_000));
    }
    const done = await Promise.all(clients);
    return done.every(Boolean) ? 0 : 1;
  }
  if (cmd === "attack") {
    const script = fileURLToPath(new URL("../../../apps/server/scripts/e2e.mjs", import.meta.url));
    return (
      spawnSync(process.execPath, [script], {
        stdio: "inherit",
        env: { ...process.env, BASE: base },
      }).status ?? 1
    );
  }
  console.error("usage: pnpm playtest <smoke|fill CODE|attack> [options]  (see src/cli.ts)");
  return 2;
}

process.exit(await main());

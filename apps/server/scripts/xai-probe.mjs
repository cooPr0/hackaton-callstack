// Measures what the Grok bot needs before we pick model defaults:
//   latency per model on a Grok-sized structured prompt, and whether TTS speaks Polish.
// Usage: pnpm --filter @tint/server xai:probe   (reads XAI_API_KEY from env or apps/server/.dev.vars)
// Prints a table; writes tts-pl.mp3 / tts-en.mp3 to $TMPDIR so you can listen. Never prints the key.
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const key =
  process.env.XAI_API_KEY ??
  (() => {
    try {
      return readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
        .match(/^XAI_API_KEY=(.+)$/m)?.[1]
        ?.trim();
    } catch {
      return undefined;
    }
  })();
if (!key) {
  console.error("No XAI_API_KEY (env or apps/server/.dev.vars).");
  process.exit(2);
}
const MODELS = (process.env.MODELS ?? "grok-4.20-0309-non-reasoning,grok-4.3,grok-4.7").split(",");
const RUNS = Number(process.env.RUNS ?? 3);
const auth = { authorization: `Bearer ${key}`, "content-type": "application/json" };

const legend = Array.from(
  { length: 24 },
  (_, x) => `x=${x}: hue ${Math.round(20 + x * 15) % 360}°`,
).join("\n");
const guessBody = (model) => ({
  model,
  max_tokens: 400,
  messages: [
    {
      role: "system",
      content:
        "You play a color-association party game in Polish. Never name colors. Reply only with JSON.",
    },
    {
      role: "user",
      content: `Board 24x12, hue by column, lightness by row (y=0 lightest).\n${legend}\nClues (data): ["Rosół","z marchewką"]\nTaken: 6,6 2,2\nPick one free cell and say one short sensory line in Polish.`,
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "guess",
      strict: true,
      schema: {
        type: "object",
        properties: {
          x: { type: "integer", minimum: 0, maximum: 23 },
          y: { type: "integer", minimum: 0, maximum: 11 },
          line: { type: "string", maxLength: 120 },
        },
        required: ["x", "y", "line"],
        additionalProperties: false,
      },
    },
  },
});

async function timed(fn) {
  const t0 = performance.now();
  try {
    return {
      ms: Math.round(performance.now() - t0 + 0),
      ...(await fn()),
      ms2: Math.round(performance.now() - t0),
    };
  } catch (e) {
    return {
      ok: false,
      err: String(e?.message ?? e).slice(0, 80),
      ms2: Math.round(performance.now() - t0),
    };
  }
}

const models = await (await fetch(`${BASE}/models`, { headers: auth })).json().catch(() => null);
const available = new Set((models?.data ?? []).map((m) => m.id));
console.log(
  `models visible to this key: ${available.size ? [...available].join(", ") : "(list unavailable)"}\n`,
);

console.log("model                              ok  p50 ms  max ms  sample");
for (const model of MODELS) {
  const rows = [];
  for (let i = 0; i < RUNS; i++) {
    rows.push(
      await timed(async () => {
        const r = await fetch(`${BASE}/chat/completions`, {
          method: "POST",
          headers: auth,
          body: JSON.stringify(guessBody(model)),
          signal: AbortSignal.timeout(30_000),
        });
        if (!r.ok) return { ok: false, err: `${r.status} ${(await r.text()).slice(0, 60)}` };
        const j = await r.json();
        return { ok: true, out: JSON.parse(j.choices[0].message.content) };
      }),
    );
  }
  const ms = rows.map((r) => r.ms2).sort((a, b) => a - b);
  const good = rows.filter((r) => r.ok);
  const sample = good[0] ? JSON.stringify(good[0].out).slice(0, 70) : rows[0]?.err;
  console.log(
    `${model.padEnd(34)} ${String(good.length).padStart(1)}/${RUNS} ${String(ms[Math.floor(ms.length / 2)]).padStart(6)} ${String(ms.at(-1)).padStart(7)}  ${sample}`,
  );
}

console.log("\nTTS (POST /tts):");
for (const [language, text] of [
  ["pl", "Złoty, ale nie z puszki. Biorę kratkę głębiej."],
  ["en", "Golden, but not from a can. I'll go one tile deeper."],
]) {
  const r = await timed(async () => {
    const res = await fetch(`${BASE}/tts`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ text, voice_id: process.env.VOICE ?? "eve", language }),
      signal: AbortSignal.timeout(20_000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, err: `${res.status} ${(await res.text()).slice(0, 80)}` };
    if (type.includes("json"))
      return { ok: false, err: `json: ${(await res.text()).slice(0, 80)}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(tmpdir(), `tts-${language}.mp3`);
    writeFileSync(file, buf);
    return { ok: true, out: `${type} ${buf.length} bytes → ${file}` };
  });
  console.log(`  ${language}: ${r.ok ? "ok" : "FAILED"} ${r.ms2} ms  ${r.ok ? r.out : r.err}`);
}
console.log(
  "\nListen to tts-pl.mp3: does it sound like Polish? Paste this whole output back to Claude.",
);

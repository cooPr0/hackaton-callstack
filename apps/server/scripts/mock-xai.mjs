// Local stand-in for api.x.ai used by e2e: `node scripts/mock-xai.mjs [port]`.
// Chat completions answer by schema name: guess → {x, y, line}, clue → {word}, line → {line}.
// Control it over HTTP:  POST /__mock {"delayMs": 3000, "guess": {"x":3,"y":4,"line":"…"}}
//                        GET  /__mock → {calls: [...task names]}
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 8799);
const state = {
  delayMs: 0,
  guess: { x: 3, y: 4, line: "Czyli rosół z piątku." },
  clue: { word: "Rosół" },
  line: { line: "Pachnie mi to niedzielnym obiadem." },
  calls: [],
};
const read = (req) =>
  new Promise((r) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => r(b));
  });

createServer(async (req, res) => {
  const body = await read(req);
  if (req.url === "/__mock") {
    if (req.method === "POST")
      Object.assign(
        state,
        JSON.parse(body || "{}"),
        req.method === "POST" && JSON.parse(body || "{}").reset ? { calls: [] } : {},
      );
    res.end(JSON.stringify({ calls: state.calls, delayMs: state.delayMs }));
    return;
  }
  if (req.url?.endsWith("/chat/completions")) {
    const name = JSON.parse(body).response_format?.json_schema?.name ?? "line";
    state.calls.push(name);
    await new Promise((r) => setTimeout(r, state.delayMs));
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(state[name] ?? {}) } }] }),
    );
    return;
  }
  res.statusCode = 404;
  res.end("{}");
}).listen(port, () => console.log(`mock xAI on :${port}`));

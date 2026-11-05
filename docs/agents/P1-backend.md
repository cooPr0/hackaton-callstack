# Brief P1: Backend + AI + protocol owner

**Role**: you build the authoritative game server, the Grok bot and the playtest bot. You own the contract, and the other three agents depend on you, so **ship a deployed server early (T+0:45)**.

**Owns**: `apps/server`, `apps/playtester-worker`, `packages/{game-core,protocol,playtester}`, `shared/**`, `.github/**`.
**Reads**: `CLAUDE.md`, `docs/RULES.md`, `docs/PROTOCOL.md`, `packages/protocol/src/*`, `packages/game-core/src/types.ts`.
**Already done (foundation)**: protocol zod schemas + constants, fixtures + `fixtures:check`, palette generator + `shared/palette.json`, engine types (`GameState`, `Action`, `EngineResult`). All deps are pre-installed (wrangler, workers-types, zod, culori, vitest, tsx).

**Human setup**:
- Cloudflare account + `pnpm --filter @tint/server exec wrangler login`.
- xAI API key (confirm the model id on docs.x.ai).
- Discord webhook URL for `#playtest-bot`.
- Set secrets with `wrangler secret put XAI_API_KEY`, `DISCORD_WEBHOOK_URL` and `PLAYTEST_TRIGGER_SECRET`. Locally they go in `apps/server/.dev.vars` (gitignored); commit `.dev.vars.example`.

## Branches (in order; one PR each; commit every small step)

### 1. `p1/game-core-rules`
- `src/viewfinder.ts`: `viewfinderWindow(target)`, clamped (`x0 = clamp(tx-3,0,17)`, `y0 = clamp(ty-4,0,3)`), + tests for the corners and center.
- `src/scoring.ts`: `chebyshev`, `scoreStone`, `awardsFor(round)` → `Award[]` (exact/near/far + cue-giver `house`), + tests. **Must reproduce `shared/fixtures/views/reveal.json` awards.**
- `src/clue.ts`: `validateClue(text, phase)` → `ok | INVALID_CLUE | COLOR_WORD`. Letters and spaces only, ≤24 chars, 1 word / 1–2 words. PL + EN color stem blocklist (diacritic-insensitive), + tests.
- `src/rng.ts`: a seeded PRNG (mulberry32) for target picks.
- `src/machine.ts`: `createGame(req, code, seed)`, `apply(state, action): EngineResult`. Turn order puts Grok first, then the human guessers in seat order. Cue giver rotation per mode. Pause, skip, next, end. **Tests cover a full 2-round game.**
- Done when: `pnpm --filter @tint/game-core test` is green.

### 2. `p1/server-room`
- Add the `dev` (`wrangler dev --ip 0.0.0.0 --port 8787`), `deploy`, `typecheck` and `test` scripts.
- `wrangler.toml`: name `tint-server`, `main = src/index.ts`, `compatibility_date` = today, DO binding `ROOMS` → class `Room`, migration `new_sqlite_classes = ["Room"]`, vars `ALLOWED_ORIGINS`, `XAI_MODEL`, `ALLOW_PLAYTESTERS`.
- `src/index.ts`: the router.
  - `GET /api/health`.
  - `POST /api/rooms`: generate the code from `ROOM_CODE_ALPHABET` and call `idFromName(code)` → DO `init`.
  - `POST /api/rooms/:code/join`.
  - `GET /api/rooms/:code/ws` → DO.
  - CORS + `Origin` allowlist (an absent Origin, from native iOS, is allowed).
- `src/room.ts` (Durable Object):
  - `ctx.acceptWebSocket` (Hibernation).
  - `setWebSocketAutoResponse` for ping/pong.
  - Token check against SHA-256 hashes, with seat ids in `ws.serializeAttachment`.
  - `hello` → `welcome` + `view`.
  - zod-parse every message.
  - `apply` → persist to `ctx.storage` → broadcast.
  - Restore in the constructor with `blockConcurrencyWhile`.
  - Rate limit of 20 msgs per 5 s per socket.
- `src/projection.ts`: `projectView(state, seatIds): PlayerView`. **Test: no `secret` for non-cue-giver seats before REVEAL** (reuse `secretLeak` from `packages/protocol/scripts/fixtures.ts`).
- Done when: `wrangler dev` runs and a manual session (2 `websocat` terminals or a tiny script) plays a round.

### 3. `p1/fallback-bot`
- Alarm scheduler: in a GUESS phase where it's Grok's turn, send `bot.status thinking`, then the alarm fires at least 1.2 s later and Grok moves.
- `src/bot/fallback.ts`: keyword → (hue, lightness) map with noise for guesses; the cell descriptor's word for clues (mode `grok`). It must pass `validateClue`.
- Turn timeouts via the alarm (60 s online).
- Done when: a full game completes with `botMode: "fallback"`.

### 4. `p1/playtester` ⏰ **deploy + post the URL in `#web-server` by T+0:45**
- `packages/playtester/src/client.ts`: `PlaytestClient` (fetch create/join, global `WebSocket`, cid/ack tracking, reconnect).
- `personas.ts`: `casual` (1–4 s delays, guesses near the clue's hue via the fallback map) and `speedy`.
- `invariants.ts`:
  1. No `secret` for a non-cue-giver before REVEAL.
  2. `seq` strictly increasing.
  3. Legal phase order.
  4. Grok first in each GUESS phase.
  5. Scores match `awardsFor`.
  6. Stones are on unique cells.
  7. The game reaches GAME_OVER.
- `src/cli.ts` + root script `pnpm playtest`:
  - `smoke --env local|prod [--mode stol] [--players 3] [--real-grok]` exits non-zero on failure.
  - `fill <CODE> --count N --env …` joins someone's room as fake humans.
- `report.ts`: JSON + Discord embed formatter.
- `pnpm --filter @tint/server deploy` and post the `workers.dev` URL.

### 5. `p1/grok`
- `src/bot/xai.ts`: POST `https://api.x.ai/v1/chat/completions` (OpenAI-compatible), structured JSON output, 8 s `AbortController` timeout, logs latency.
- `prompts.ts`: Polish persona, short and sensory, **never color names**, defends misses. Few-shot from the design: "Złoty, ale nie z puszki. Biorę kratkę głębiej." / "Czyli rosół z piątku."
- `boardText.ts`: a compact table of `x,y,hex,L,C,h,descriptor` from `shared/palette.json`. Human clues are quoted, capped data (prompt-injection hygiene).
- `guess.ts` → `{x,y,line}` (snap to the nearest free cell). `clue.ts` → `{word}` (validator + 2 retries → fallback). `defend.ts` → `{line}` at REVEAL.
- Budget: 30 calls per 10 min per room; beyond that use the fallback and set seat `degraded: true`.
- Done when: `pnpm playtest smoke --env prod --real-grok` is green.

### 6. `p1/playtest-cron`
- `apps/playtester-worker`: cron `*/10 * * * *` plays a fallback smoke game (a real-Grok game at minute 0) and posts to `DISCORD_WEBHOOK_URL`. `POST /run` requires the `x-playtest-secret` header.
- Done when: a green post shows up in `#playtest-bot`.

### 7. `p1/hardening`
- `flaky` (reconnect mid-turn, duplicate cids) and `adversary` personas (out-of-turn stones, color clues, foreign seatIds, forged tokens, oversized payloads; each must get the right `error.code`) → `pnpm playtest attack`. Fix what breaks.

## Checkpoints
- T+0:45 prod smoke green.
- T+1:15 web plays a full round vs Grok.
- T+1:45 cross-play.
- T+2:30 freeze: cron and attack green.
- At each sync, tag `main`: `m1-web-round`, `m2-crossplay`, `m3-freeze`, `demo`.

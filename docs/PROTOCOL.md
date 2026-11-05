# Tint & Tell: Protocol v1

The code is the source of truth: `packages/protocol/src/*.ts` (zod). The Swift mirror is in `apps/ios/TintKit/Sources/TintKit/Protocol/`.
Golden examples are in `shared/fixtures/{messages,views}/*.json`. **Both TS and Swift tests decode them, so drift breaks CI.**

## Change policy
- After `m0-foundation`, changes are **additive only**: new optional fields or new message types. Never rename or remove anything.
- A protocol PR updates the zod schema, `scripts/gen-fixtures.ts`, the regenerated fixtures (`pnpm --filter @tint/protocol fixtures:gen`) and the Swift mirror together. Announce it in `#protocol`.
- CODEOWNERS: P1 plus one client owner must approve.

## System map
```
 iOS app ──┐   HTTPS /api/...          ┌──────────── Cloudflare ────────────────────┐
 Web app ──┼─► WSS /api/rooms/:code/ws ─► Worker tint-server ─► Room DO (1 per code) │─► api.x.ai
 Playtester┘                           │  Worker tint-playtester (cron) ────────────│─► Discord
                                       └────────────────────────────────────────────┘
```
iOS and web never talk to each other. Both are clients of the same Room DO.

## Environments
| Env | Server | Web | iOS |
|---|---|---|---|
| local | `pnpm --filter @tint/server dev` → `wrangler dev --ip 0.0.0.0 --port 8787` | `apps/web/.env.local`: `VITE_API_URL=http://<LAN-IP>:8787` | `Config/Local.xcconfig`: `API_HOST = <LAN-IP>:8787`, `API_SCHEME = http` (+ ATS `NSAllowsLocalNetworking`) |
| prod | `https://tint-server.<sub>.workers.dev` | `https://tint-and-tell.pages.dev` | `Config/Prod.xcconfig`: `API_HOST = tint-server.<sub>.workers.dev`, `API_SCHEME = https` |

- An iOS simulator can use `localhost:8787`. A physical device needs the Mac's LAN IP.
- Join links: `https://tint-and-tell.pages.dev/join/CODE` and `tintandtell://join/CODE`.

## HTTP
| Route | Request → Response | Errors |
|---|---|---|
| `POST /api/rooms` | `CreateRoomRequest` → `CreateRoomResponse` | 400 |
| `POST /api/rooms/:code/join` | `JoinRoomRequest` → `JoinRoomResponse` | 404 `ROOM_NOT_FOUND`, 409 `ROOM_FULL` |
| `GET /api/rooms/:code/ws?token=…&pv=1` | WebSocket upgrade. Repeat `token` to control several seats (local mode). | Refusals are a socket that sends `error` then closes, see "Close codes" |
| `GET /api/health` | `HealthResponse` | |

- Local rooms (`local: true`) return tokens for **all** human seats. Online rooms return only the creator's, and the other humans `join`.
- Tokens are 128-bit random and the server stores only SHA-256 hashes. Clients keep them in Keychain (iOS) or localStorage (web), keyed by room code, for reconnects.
- Non-2xx bodies are `{ code, message }`.
- Per-IP rate limits (per minute): 20 room creates, 60 joins, 300 socket upgrades → 429 `RATE_LIMITED`. Request bodies must declare `content-length` ≤ 4 KB.

## WebSocket
Every client message carries a `cid`, and the server replies `ack {cid}` or `error {cid, code, message}`.

| Client → Server | Fields | Allowed when |
|---|---|---|
| `hello` | `pv: 1, platform, name?` | first message; reply `welcome` + `view` |
| `game.start` | | LOBBY, host |
| `clue.submit` | `seatId, text` | SECRET_1 / SECRET_2, cue-giver seat you control |
| `stone.place` | `seatId, x, y` | GUESS_n, `seatId == turnSeatId`, you control it |
| `round.next` | | REVEAL |
| `pause.set` | `paused` | not LOBBY |
| `game.end` | | host |
| `ping` | | every 20 s; reply `pong` (no `ack`) |

| Server → Client | Fields |
|---|---|
| `welcome` | `seatIds, serverTime, protocol: 1` |
| `view` | `seq, view: PlayerView`, a **full snapshot** after every change. Drop any `seq ≤ lastSeq` |
| `bot.status` | `seatId, state: thinking \| idle` |
| `bot.say` | `seatId, text` |
| `ack` / `error` | `cid` / `cid?, code, message` |
| `pong` | |

Error codes: `PROTOCOL_MISMATCH BAD_REQUEST BAD_TOKEN NOT_YOUR_TURN NOT_YOUR_SEAT CELL_TAKEN INVALID_CLUE COLOR_WORD WRONG_PHASE PAUSED RATE_LIMITED ROOM_FULL ROOM_NOT_FOUND INTERNAL`.

- A retransmitted `cid` (same seat) is acked again but **not re-applied**, so retry freely after a timeout.
- Frames over 4 KB or binary frames → `error BAD_REQUEST`, then close `1009`. More than 20 messages per 5 s → `error RATE_LIMITED`.
- One live socket per seat: a newer socket for the same seat replaces the old one, which closes with `4409`.

### Close codes (don't reconnect on these)
A browser can't read the HTTP status of a failed upgrade (it sees `1006`), so the server accepts the socket, sends `error {code}` and closes:

| Close | Error code | Meaning |
|---|---|---|
| `4401` | `BAD_TOKEN` | missing/unknown token |
| `4404` | `ROOM_NOT_FOUND` | unknown or expired room |
| `4409` | | this seat was taken over by a newer connection (another tab/device) |
| `4426` | `PROTOCOL_MISMATCH` | `pv` ≠ 1 |

Anything else (`1006`, `1001`, …) is transient: reconnect with backoff.

## PlayerView (per connection)
See `packages/protocol/src/view.ts`. Key fields:
- `you`: the seats this connection controls. Use them to decide your role: cue giver if `you ∋ cueGiverSeatId`, your turn if `you ∋ turnSeatId`.
- `secret`: **only** for the cue giver's connection (or everyone in REVEAL/GAME_OVER). The server must never broadcast one shared payload. It builds `projectView(state, seatIds)` per socket.
- `reveal`: present in REVEAL, with per-stone awards and Grok's optional line.

## Flows
**Online (cross-play)**:
1. The host calls `POST /rooms {local:false}` and shares the code/QR.
2. Others call `POST /join`, open the WS and send `hello`.
3. The host sends `game.start`.
4. SECRET_1: only the cue giver gets `secret` and sends `clue.submit`.
5. GUESS_1: `bot.status thinking`, then Grok's stone and `bot.say`. Then the humans place stones in turn.
6. SECRET_2 → GUESS_2 → REVEAL, then `round.next`.

**Local (pass-and-play)**:
- One socket controls all the human seats. The client chooses screens from `(phase, posture, role)`:
  - SECRET_n: viewfinder only while **closed**; after the clue, "Rozłóż telefon na stole".
  - GUESS_n: table only while **open**, never rendering `secret`.
  - Entering SECRET_2: "‹cue giver›, złóż telefon".
  - REVEAL: on the table. Then the closed screen shows "Podaj ‹next cue giver›" → `round.next`.

**Reconnect**:
- Backoff 0.5 s → 8 s. Reconnect with the stored token, send `hello`, get the full `view`.
- `seq` is persisted with the game and never goes backwards. Still reset `lastSeq` on every `welcome`.
- Online timeouts keep the room moving: a silent guesser is skipped after 60 s; a silent cue giver gets a server-chosen clue after 90 s. `turnDeadline` is set for both (SECRET and GUESS phases), null in local mode.
- Rooms expire after 2 h without activity, and 10 min after GAME_OVER.
- The DO persists state on every transition (hibernation evicts memory) and keeps each socket's seat ids in `ws.serializeAttachment`.

## Posture (fold)
- iOS: `open = width > height && width >= 700` (Duo is assumed at ≈402×874 closed and ≈1036×828 open), plus a DEBUG 3-finger-tap override.
- Web: `matchMedia('(horizontal-viewport-segments: 2)')` → landscape ≥ 900 px → manual `F` key / "Złóż/Rozłóż" pill.
- In online mode posture only chooses the layout.

## v1.1 — Grok voice, speech, hints, room language (additive)
All fields below are optional or new message types. v1 clients keep working: unknown message types are dropped, missing optional fields mean "not available".

| Where | Change | Client behavior |
|---|---|---|
| `CreateRoomRequest.lang` | `"pl" \| "en"`, default `"pl"` | Send the UI locale. Grok's clues, lines, speech and voice follow it. |
| `PlayerView.lang` | room language | Absent (v1 server) = `"pl"`. |
| `bot.say.audioUrl` | same-origin `/api/rooms/:code/say/:lineId.mp3` | Prefix with the API base URL and play it if sound is on. Absent = show text only. |
| C→S `grok.ask {seatId, draft?}` | ask Grok for a hint grounded in recent X posts | Seat must be yours. `draft` (SECRET phases, cue giver) follows the clue rules. |
| S→C `grok.hint {seatId, text, citations}` | unicast answer, ≤ 2 citations | Show the text and the `@handle`s (links to `x.com`). Never broadcast. |
| C→S `voice.ticket {seatId}` | ask for a realtime voice secret | Seat must be yours. |
| S→C `voice.ready {seatId, value, expiresAt, url, model, voice, session}` | unicast ephemeral xAI secret | Open `url` with `Sec-WebSocket-Protocol: xai-client-secret.<value>` before `expiresAt`, send `session` first, then PCM16. Audio never touches our server. |

**Spoken lines (server, shipped).** `GET /api/rooms/:code/say/:lineId.mp3` returns `audio/mpeg` for a line Grok said in that room (the id is 128-bit and only exists for such lines). It is synthesized on first request (xAI TTS, ~0.7 s), cached for a day, and answers `404` when speech is off, the room's budget (4000 characters) is spent, or the id is unknown. Only rooms with real Grok (`botMode: "grok"`) announce `audioUrl`. A client that gets a non-200 simply shows the text.

Error codes `VOICE_UNAVAILABLE` and `HINT_UNAVAILABLE` arrive with the server PRs that emit them, together with the web copy (web keeps one message per error code).

### Deviations from `docs/GROK-LIVE.md`
1. **Global spend guard for voice.** An xAI client secret can't lock instructions or tools, so per-room caps alone would let anyone who creates rooms spend voice minutes. The server adds a global daily quota and a per-IP limit, and only issues tickets in started rooms with at least two connected humans.
2. **"No color names" is instruction-only for live voice.** Speech can't be filtered; every text field (`bot.say`, `grok.hint`) is still checked against the color blocklist.
3. **No X search in Grok's guess path.** Grok moves first and everyone waits, so search runs only for `grok.ask` and when Grok is the cue giver, never before Grok's stone.
4. **Language follows the room** (`lang`), not "Polish only".
5. **One Responses call per hint.** `x_search` and the structured `{text, citations}` output go in a single request to keep the hint under one round-trip.

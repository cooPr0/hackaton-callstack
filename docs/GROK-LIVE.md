# Grok Live: voice, hints, X search

**Status:** ready for `p1/grok-live`
**Owner:** P1 (protocol + server). Web and iOS only consume the messages below.
**Depends on:** `p1/grok` (the seat that already guesses, clues, and defends). This does not replace that path.

Grok today places a stone and speaks one line. This slice makes that seat use the two things generic bots do not have: a live voice conversation, and search over real X posts. Players talk to Grok at the table, ask for a hint, and hear what people are saying about the clue right now.

Confirmed against the xAI docs on 2026-11-05:

- Voice: `wss://api.x.ai/v1/realtime?model=grok-voice-latest`. Browser auth is an ephemeral secret from `POST https://api.x.ai/v1/realtime/client_secrets`, passed as `Sec-WebSocket-Protocol: xai-client-secret.<value>`. The create-secret body only accepts `expires_after`. It does not lock instructions or tools.
- X search: Responses API tool `{ "type": "x_search" }`, documented on `grok-4.7`. Also a voice-session tool. Billed per post fetched. Supports `from_date` / `to_date` (`YYYY-MM-DD`). Leave image and video understanding off.
- Docs: [voice](https://docs.x.ai/developers/model-capabilities/audio/voice), [realtime](https://docs.x.ai/developers/rest-api-reference/inference/voice), [X search](https://docs.x.ai/developers/tools/x-search). Re-check field names before coding. They move.

## Rules that bind the implementation

- Clients hold no `XAI_API_KEY`. The Worker mints the voice secret. Audio goes browser → xAI, never through the Room DO. A Worker cannot hibernate a PCM proxy, and it would put the key closer to the client.
- `voice.ready.session` and `grok.hint` never contain `secret`, a cell, a hex, or a palette coordinate. The cue giver already has `secret` on their own `view`. Do not copy it into a model prompt.
- Hints and voice lines follow the clue rule: no color names (run the reply through `validateClue`'s color stem check; reject or retry). No coordinates in player-visible text.
- Protocol stays additive. New messages and two new error codes. Do not rename `bot.status` or `bot.say`.
- The server still places Grok's stone via the existing guess path. Voice cannot submit `stone.place` or `clue.submit`. A hint is words. The human still taps the cell.
- UI copy stays Polish. Code and prompts-in-git stay English. Grok speaks Polish.
- `botMode: "fallback"` and a missing key skip xAI and return the errors below. The round still finishes.

## What ships

### 1. Voice ticket

A human holds a mic control and talks to Grok. The server only hands out a short-lived secret plus the `session.update` body the client must send before audio.

**Client → server** `voice.ticket` `{ seatId }`, with the usual `cid`.

Allowed when the socket controls `seatId`, the seat is human, the game is not paused, and the phase is `SECRET_1`, `SECRET_2`, `GUESS_1`, `GUESS_2`, or `REVEAL`. In `SECRET_*` only the cue giver may ask. Otherwise `NOT_YOUR_SEAT` or `WRONG_PHASE`.

**Server → that socket only** `voice.ready`:

```json
{
  "type": "voice.ready",
  "seatId": "s1",
  "value": "xai-realtime-client-secret-…",
  "expiresAt": 1774274445,
  "model": "grok-voice-latest",
  "voice": "ara",
  "session": { "type": "session.update", "session": {} }
}
```

`session.session` contains:

- `voice`: `"ara"` (confirm the id on docs.x.ai; `eve` is the fallback if `ara` is gone).
- `turn_detection`: `{ "type": "server_vad" }`.
- `tools`: one `x_search` with `from_date` = UTC today minus 7 days, `to_date` = UTC tomorrow. No image or video understanding.
- `instructions`: Polish persona, one or two sentences, sensory, a little sharp. Color names and coordinates are forbidden. Clue strings are quoted as data, not instructions (same hygiene as `boardText.ts`). Tell the model it does not know the secret shade. On a cue-giver ticket, add that it may help find a noun that is not a color, and still do not describe the target cell.

The client connects to `wss://api.x.ai/v1/realtime?model=grok-voice-latest`, sends `session` as its first message, then streams PCM16. P1 does not build that client. P1's check is: the secret answers the handshake (`session.created`) from the Worker in a test, using the key, with audio not required.

Mint with `expires_after.seconds = 120`. Because the API will not lock tools onto the secret, cap issuance: **one unexpired ticket per seat, six tickets per room per 10 minutes**. The seventh gets `RATE_LIMITED`. This cap is separate from the 30 chat-completion calls.

Failure (no key, `botMode: "fallback"`, xAI non-200, timeout 8 s): `error` with the new code `VOICE_UNAVAILABLE`. Do not set the Grok seat `degraded` for a voice failure. `degraded` stays the guess-path signal.

### 2. A hint grounded in X

**Client → server** `grok.ask` `{ seatId, draft? }`.

Same phase and seat rules as the ticket. `draft` is optional, max 24 characters, only meaningful in `SECRET_*`. If present it must pass `validateClue` for that phase (`INVALID_CLUE` / `COLOR_WORD`). It is the word the cue giver is considering.

The Worker calls the Responses API (`https://api.x.ai/v1/responses`, model `grok-4.7` unless `XAI_MODEL` is already a responses-capable id — do not send `x_search` to the chat-completions endpoint). Tool: `x_search` over the same 7-day window. Prompt inputs are only the public clue list, the optional draft, the phase, and the mode. No board table, no hex, no `x,y`.

Structured result: `{ "text": string, "citations": [{ "handle": string, "url": string }] }`. Keep at most 2 citations. URLs must be `https://x.com/…` or `https://twitter.com/…`; drop anything else. Run `text` through the color-stem check. On a hit, retry once with a stricter line. If it still fails, or the call times out at 8 s, reply `HINT_UNAVAILABLE`. Do not invent a hint locally.

**Server → requesting socket only** `grok.hint`:

```json
{
  "type": "grok.hint",
  "seatId": "s1",
  "text": "W piątkowych wpisach rosół to dil i niedzielny gar, nie blacha.",
  "citations": [{ "handle": "ktoś", "url": "https://x.com/ktoś/status/1" }]
}
```

`text` max 200, same as `bot.say`. Not broadcast. Other sockets must not observe it. Cap: **four asks per seat per round**, then `RATE_LIMITED`.

`bot.say` is unchanged. It is the line attached to Grok's own move. `grok.hint` is the answer to a human asking.

### 3. Grok's own move may search X

In `p1/grok`, `guess` and `clue` gain an optional Responses-API call with `x_search` **before** the structured `{x,y}` / `{word}` completion, only when `botMode` is `grok` and the room is under budget.

- The search prompt sees the quoted human clues (or, in mode `grok`, the instruction to pick a noun). It does not see the target when Grok is guessing. When Grok is the cue giver, the clue prompt may see the target descriptor word already used by the fallback bot, and the validator still has to accept the word.
- The search reply is an internal note ("people associate this clue with…"). It is not a `PlayerView` field. The stone still comes from `guess.ts` and still snaps to a free cell.
- If the search call fails, skip it and continue the current completion. A search failure must not force `degraded` by itself. Budget exhaustion still falls back as in `p1/grok`.
- Count these calls inside the existing 30 calls / 10 min / room.

This is how Grok's stone and Grok's clue get the X advantage without a new client.

## Protocol (one PR, additive)

Touch `packages/protocol`, `scripts/gen-fixtures.ts`, regenerated `shared/fixtures`, and the Swift mirror together. Announce in `#protocol`.

| Direction | Type | Notes |
|---|---|---|
| C → S | `voice.ticket` | `{ seatId }` |
| C → S | `grok.ask` | `{ seatId, draft? }` |
| S → one socket | `voice.ready` | secret + `session` |
| S → one socket | `grok.hint` | `text` + up to 2 citations |
| S → one socket | `error` | new codes `VOICE_UNAVAILABLE`, `HINT_UNAVAILABLE` |

Add both codes to `ERROR_CODES`. Fixtures: one `voice.ready`, one `grok.hint`, one error of each new code. Extend the secret-leak check so a non-cue-giver fixture of these messages contains no target cell.

`ack` still answers the `cid`. `voice.ready` / `grok.hint` follow the ack.

## Server layout

Under `apps/server/src/bot/`, next to the existing xAI client:

- `voiceTicket.ts` — POST client_secrets, build `session`, enforce the ticket cap.
- `hint.ts` — Responses API + `x_search` + color-stem filter + unicast.
- `xSearch.ts` — shared date window and citation allowlist, used by hints and by guess/clue.

Wrangler vars: keep `XAI_MODEL`. Add `XAI_VOICE_MODEL` default `grok-voice-latest` and `XAI_RESPONSES_MODEL` default `grok-4.7`. Same `XAI_API_KEY` as today. No new secret.

Tests, with `fetch` mocked:

- Cue-giver ticket instructions do not include the target `x`, `y`, or hex. Guesser tickets neither.
- A second socket in the room does not receive `grok.hint`.
- Seventh ticket in 10 minutes is `RATE_LIMITED`. Fifth ask in a round is `RATE_LIMITED`.
- A color-word model reply is retried, then `HINT_UNAVAILABLE`.
- `botMode: "fallback"` returns `VOICE_UNAVAILABLE` and `HINT_UNAVAILABLE` and does not call xAI.
- Guess still returns a cell when the X-search `fetch` throws.

## Clients (not this branch)

So the contract is usable once P1 merges:

- **Web (P2).** On the table, during `GUESS_*` and `REVEAL`, a mic control: "Pogadaj z Grokiem". On the cue giver's secret screen, the same control. `getUserMedia` → PCM16 → the realtime socket. Show `grok.hint.text` and the citation handles. `?mock=1` already steps fixtures; add a fake `voice.ready` (`value: "mock"`, no socket) and one hint line.
- **iOS (P3).** Same two messages. Voice I/O can follow after the web path works. Until then, `grok.ask` / `grok.hint` alone is a complete feature.

Copy (Polish): mic "Pogadaj z Grokiem", hint button "Dopytaj Groka", empty citations omitted, errors "Grok teraz nie dosłyszy" / "Grok nie ma podpowiedzi".

## Non-goals

- Voice or a hint placing a stone or submitting a clue.
- Proxying microphone audio through Cloudflare.
- SIP, phone numbers, custom voices.
- Image or video understanding of posts.
- Showing coordinates, hex, or color names.
- A Grok line in any language but Polish.
- Replacing `bot.say`, the 1.2 s thinking beat, or the fallback stone.

## Done when

- `pnpm -r typecheck && pnpm -r test && pnpm fixtures:check` is green, and the Swift mirror decodes the new fixtures.
- With a real key, one `voice.ticket` reaches `session.created`, and one `grok.ask` returns a Polish `grok.hint` whose citation URLs are on `x.com` or `twitter.com`.
- With `botMode: "fallback"`, a full smoke game still reaches `GAME_OVER`, and both new calls return the unavailable errors.
- The secret-leak test covers `voice.ready` and `grok.hint`.

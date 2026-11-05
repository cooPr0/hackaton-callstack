# Tint & Tell: 4 people × 4 parallel Claude agents (3 h)

## Context
The repo `hackaton-callstack` is empty (one commit, `test`). Tint-and-Tell.pdf specifies a color-association party game. Humans and an AI player ("Grok") try to hit the same shade on a 24 × 12 board using word clues. A foldable "iPhone Duo" is the hook: closed = private secret, open = shared table.

Decisions:
- Local pass-and-play **and** online rooms, with iOS and web in the same room.
- Cloudflare Workers + Durable Objects.
- xAI Grok bot.
- A headless playtest bot for live testing.
- About 3 h.
- 4 people: P1 backend/AI, P2 web, P3 iOS shell, P4 iOS table.

**How the work is split:**
1. **This session (Paweł) builds only the Foundation**: the shared contract every agent builds against (protocol, fixtures, palette, rules, repo tooling, 4 agent briefs). It is about 10 small commits, merged to `main` in ~15 min.
2. Then **each of the 4 people starts their own Claude Code agent** on their own machine, pointed at their brief (`docs/agents/P*.md`).
3. Each agent works through a **sequence of short branches**, commits every small step, opens a PR per branch, and rebase-merges. `main` ends up with the full, linear, readable history of all 4 streams.

**Roles**:
- **Paweł = P2 (Web).** Paweł runs the Foundation in this session, in this repo (`/Users/pawelwysoczanski/Projects/hackaton-callstack`, remote `github.com/cooPr0/hackaton-callstack`), then continues as P2 with branch `p2/scaffold`.
- The 3 teammates take P1 (backend/AI), P3 (iOS shell) and P4 (iOS table).
- The P1 person owns the Cloudflare/xAI/Discord setup.

**Local environment (checked)**: Node 24, pnpm 12 via corepack, `gh` installed but **not logged in** (`gh auth login` is needed before issues/PRs), no `wrangler` or `xcodegen` installed (they're installed as devDependencies or by the iOS people). Foundation verification therefore covers the TS packages only. The iOS project is P3's first branch.

---

# PART A: How we work

## A1. Timeline at a glance
| T | P2 = Paweł (this session) | P1 | P3 | P4 |
|---|---|---|---|---|
| T−15 | `gh auth login`, add collaborators, repo settings (rebase-merge only, auto-merge, protect main) | Cloudflare + `wrangler login`, xAI key, Discord + webhook | Xcode 26, xcodegen | Xcode 26, xcodegen |
| 0:00–0:15 | **Foundation commits → push `main`, tag `m0-foundation`** | reads PLAN, sets secrets | reads PLAN | reads PLAN |
| 0:15 | 🔔 everyone pulls and starts their agent | | | |
| 0:15–2:30 | Agent P2 (continue in this session: `p2/scaffold` → …) | Agent P1 | Agent P3 | Agent P4 |
| 1:15 | 🔔 sync + tag `m1-web-round` | | | | |
| 1:45 | 🔔 sync + tag `m2-crossplay` | | | | |
| 2:30 | 🔒 freeze + tag `m3-freeze` | | | | |
| 2:50 | 🎤 rehearsal, tag `demo` | | | | |

## A2. Kickoff (T−15 → T+0:15)
**T−15 (in parallel, before the clock starts)**
- **Paweł (P2, repo owner `cooPr0/hackaton-callstack`)**:
  - `gh auth login`, then add the 3 collaborators.
  - Settings: **only "Rebase and merge" allowed**, auto-merge on, `main` protected (CI required, no force-push), "Automatically delete head branches" on.
  - Drop `Tint-and-Tell.pdf` into `design/`, since the agents read it.
- **P1**:
  - Cloudflare account + `wrangler login`; xAI key (confirm the model id on docs.x.ai).
  - Discord: a voice channel, `#protocol #ios #web-server #playtest-bot #demo`, and a webhook for `#playtest-bot`.
- **Everyone**:
  - Node 22, `corepack enable` (pnpm 9), `gh auth login`, Claude Code logged in.
  - `git config --global alias.lg "log --graph --oneline --decorate --all"`.
- **P3, P4**: Xcode 26 + iOS 26 sims, `brew install xcodegen`, a signing team, iPhone in developer mode.

**T+0:15, once Foundation is on `main`, each person:**
```bash
git clone <repo> tint && cd tint
pnpm install && pnpm -r test                     # green before anything else
# iOS only:
cd apps/ios && xcodegen && open TintAndTell.xcodeproj   # .xcodeproj is generated, never committed
# start your agent:
claude "Read docs/agents/P<N>-<role>.md and CLAUDE.md, then execute the brief. Start with branch 1."
```
Optional, for more speed: a person can run a 2nd agent in a worktree on a later, independent branch from their own brief:
```bash
git worktree add ../tint-p4-reveal -b p4/reveal-overlay
cd ../tint-p4-reveal && claude "Read docs/agents/P4-ios-table.md, do ONLY branch 'p4/reveal-overlay'."
```

## A3. Git workflow every agent follows (written into root `CLAUDE.md`)
1. **One branch = one PR = one vertical slice**, named `p<N>/<slug>`, with the sequence listed in each brief.
2. Start from fresh main: `git switch main && git pull --rebase && git switch -c p2/net-store`.
3. **Commit every small working step** (roughly every 5–15 min of agent work), in Conventional Commits format with an area scope:
   `feat(server): …`, `feat(web): …`, `feat(ios-shell): …`, `feat(ios-table): …`, `feat(game-core): …`, `feat(protocol): …`, `test(…)`, `fix(…)`, `chore(…)`, `docs: …`, `ci: …`.
   Each message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
4. Push early: `git push -u origin HEAD`, then `gh pr create --draft --fill`.
5. When the slice is done and green locally: `git fetch && git rebase origin/main`, push, `gh pr ready`, `gh pr merge --rebase --auto`. **Never squash.** Every commit lands on `main`.
6. After the merge, start the next branch from fresh `main` right away. Don't wait for reviews in your own directories.
7. **Shared files**:
   - `packages/protocol/**` and `shared/fixtures/**`: P1 only, CODEOWNERS requires P1 plus one client owner. After 0:15 changes are additive only, announced in `#protocol`, and the Swift mirror is updated in the same PR by P3.
   - `pnpm-lock.yaml`: Foundation pre-installs every expected dependency to avoid conflicts. On a conflict: `git checkout --theirs pnpm-lock.yaml && pnpm install && git add pnpm-lock.yaml`.
   - `apps/ios/project.yml`: sources are folder-globbed, so P3 and P4 rarely touch it. `.xcodeproj` is gitignored, which means no pbxproj conflicts.
8. **Never commit** `.dev.vars`, `.env.local`, keys, `*.xcuserstate`, `*.xcodeproj`.
9. Tags only at syncs, set by P1 on `main`: `m0-foundation`, `m1-web-round`, `m2-crossplay`, `m3-freeze`, `demo`.
10. Agents **never** force-push `main`, rewrite others' commits, delete branches by hand, or edit directories outside their brief's "Owns" list. If a needed change lives elsewhere, they write an issue or a `#channel` message with the exact request.

## A4. Communication
- An always-on voice channel. Agents' questions go to their human; humans coordinate by voice.
- `#protocol`: any contract change (link the PR). `#playtest-bot`: automated reports. `#demo`: the demo script.
- A GitHub Projects board. Each brief's branches are pre-created as issues by the Foundation (`gh issue create`, labels `p1…p4`), and agents close them with `Closes #N` in the PR.
- 5-min standing syncs at 1:15 / 1:45 / 2:30, where the playtester smoke report must be green.

---

# PART B: Foundation (this session, ~10 commits, then merge to `main`)

Local branch `foundation`. One commit per row, each green. Then `git switch main && git merge --ff-only foundation`. **Push only after you confirm**, and add the remote URL if it isn't set.

| # | Commit | Contents |
|---|---|---|
| 1 | `docs: add implementation plan` | `docs/PLAN.md` (this file) |
| 2 | `chore(repo): pnpm workspace, biome, tsconfig, gitignore` | root `package.json` (scripts: `test`, `typecheck`, `playtest`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`, excluding `apps/ios`), `biome.json`, `tsconfig.base.json`, `.gitignore` (incl. `*.xcodeproj`, `.dev.vars`, `.env.local`), `.nvmrc`, lefthook pre-commit `biome check --write` |
| 3 | `chore(repo): pre-install dependencies for all workspaces` | empty `package.json` per `apps/server`, `apps/web`, `apps/playtester-worker`, `packages/{protocol,game-core,playtester}` with the deps already pinned (zod, culori, vitest, wrangler, @cloudflare/workers-types, react 19, react-dom, react-router, vite, @vitejs/plugin-react, zustand, motion, qrcode), plus `pnpm-lock.yaml` |
| 4 | `feat(game-core): OKLCH palette generator + shared/palette.json` | `packages/game-core/src/palette.ts`, `scripts/gen-palette.ts`, generated `shared/palette.json` (288 cells: x, y, hex, L, C, h, descriptor). Top row L 0.88, gamut-mapped |
| 5 | `feat(game-core): board constants and rule types` | `constants.ts` (24×12, hinge between x 11 and 12, viewfinder 7×9, scoring radii), `types.ts` (`GameState`, `Phase`, `Mode`, `Seat`). The logic itself is P1's |
| 6 | `feat(protocol): zod schemas for messages and PlayerView` | `packages/protocol/src/{client,server,view,errors}.ts` per §B4 |
| 7 | `test(protocol): golden fixtures for every message and phase view` | `shared/fixtures/messages/*.json`, `shared/fixtures/views/{lobby,secret1-cuegiver,secret1-guesser,guess1,secret2-cuegiver,guess2,reveal,gameover,local-guess1}.json`, plus `fixtures:check` |
| 8 | `docs: rules, protocol, demo script` | `docs/RULES.md`, `docs/PROTOCOL.md` (§B3–B6), `docs/DEMO.md` (§D) |
| 9 | `docs: root CLAUDE.md + four agent briefs` | `CLAUDE.md` (§A3 rules, invariants, ownership) and `docs/agents/P1-backend.md`, `P2-web.md`, `P3-ios-shell.md`, `P4-ios-table.md` (Part C, verbatim) |
| 10 | `ci: CODEOWNERS and workflows` | `.github/CODEOWNERS`, `.github/workflows/ci.yml` (ubuntu: `pnpm -r typecheck test fixtures:check`; macos, path-filtered `apps/ios/**`: `swift test` in TintKit, skipped until the package exists) |

After commit 10:
1. Run `pnpm install && pnpm -r typecheck && pnpm -r test && pnpm fixtures:check`, all green.
2. `git switch main && git merge --ff-only foundation && git tag m0-foundation`.
3. **`git push origin main --tags`**. Approving this plan authorizes this push. It's the point of the stage, so teammates can pull.
4. Write `scripts/create-issues.sh`, which runs `gh issue create` once per Part C branch with labels `p1`–`p4`. Paweł runs it after `gh auth login`, because gh isn't authenticated here.
5. Paweł's next step, same session: `git switch -c p2/scaffold` and start brief C2.

Not included in the Foundation, because they belong to their owners: game-core logic (P1), server code (P1), the web scaffold (P2, right after), and the Xcode project/TintKit (P3).

---

# PART B (cont.): Technical contract (copied into `docs/PROTOCOL.md`)

## B1. System map
```
 iOS app ──┐   HTTPS /api/...          ┌───────────── Cloudflare ──────────────────────┐
 Web app ──┼─► WSS /api/rooms/:code/ws ─► Worker "tint-server" ─► Room DO (1 per code) │─► api.x.ai
 Playtester┘                           │   Worker "tint-playtester" (cron */10) ───────│─► Discord webhook
                                       │   Pages "tint-and-tell" (web)                 │
                                       └────────────────────────────────────────────────┘
```
- iOS and web never talk to each other. Both are clients of the same Room DO and speak one JSON protocol, so cross-play is automatic.
- The server is authoritative. Clients send intents, the DO validates, applies `game-core`, and pushes a **per-connection** `view` snapshot.

## B2. Environments
| Env | Server | Web | iOS |
|---|---|---|---|
| local | `wrangler dev --ip 0.0.0.0 --port 8787` | `VITE_API_URL=http://<LAN-IP>:8787` in `apps/web/.env.local` | `Config/Local.xcconfig`: `API_HOST=<LAN-IP>:8787`, `API_SCHEME=http`; ATS `NSAllowsLocalNetworking` + `NSLocalNetworkUsageDescription` |
| prod | `https://tint-server.<sub>.workers.dev` | `https://tint-and-tell.pages.dev` | `Config/Prod.xcconfig`: `API_HOST=tint-server.<sub>.workers.dev`, `API_SCHEME=https` |

- Host and scheme are stored separately because `//` starts a comment in xcconfig.
- iOS DEBUG builds have a hidden server switcher (long-press the logo).
- The Worker's CORS allowlist covers the Pages origin and localhost:5173. The WS `Origin` is checked against the allowlist, and an absent origin (native) is allowed.
- Join: the lobby shows the code plus a QR of `https://tint-and-tell.pages.dev/join/CODE`. The page also offers "Otwórz w aplikacji" → `tintandtell://join/CODE`, a custom URL scheme handled by `onOpenURL`.

## B3. HTTP API
| Route | Body → Response |
|---|---|
| `POST /api/rooms` | `{mode:'stol'\|'ty'\|'grok', rounds, local, seats:[{name, kind:'human'\|'grok'}], botMode?:'grok'\|'fallback'}` → `{code, seats:[{seatId, token}]}`. Local mode returns all human tokens; online mode returns the creator's only |
| `POST /api/rooms/:code/join` | `{name, platform:'ios'\|'web'\|'bot'}` → `{seatId, token}` (409 when full, 404 for an unknown room) |
| `GET /api/rooms/:code/ws?token=&pv=1` | WS upgrade, forwarded to the DO |
| `GET /api/health` | `{ok, version, protocol:1}` |

- Codes are 5 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, mapped to a DO via `idFromName`.
- Tokens are 128-bit random and stored SHA-256-hashed. Clients keep them in Keychain (iOS) or localStorage (web), keyed by the code.

## B4. WebSocket messages (zod in `packages/protocol`, mirrored in Swift `TintKit`)
Every client message is `{type, cid}`, and the server answers with `ack{cid}` or `error{cid, code, message}`.

| Client → Server | Payload | Allowed |
|---|---|---|
| `hello` | `{pv:1, name?, platform}` | first message → `welcome` + `view` |
| `game.start` | `{}` | LOBBY, host seat |
| `clue.submit` | `{seatId, text}` | SECRET_1 (1 word) / SECRET_2 (1–2 words), cue giver |
| `stone.place` | `{seatId, x, y}` | GUESS_n, `seatId == turnSeatId`, cell free |
| `round.next` | `{}` | REVEAL |
| `pause.set` | `{paused}` | not LOBBY |
| `game.end` | `{}` | host |
| `ping` | `{}` | every 20 s (DO auto-response) |

| Server → Client | Payload |
|---|---|
| `welcome` | `{seatIds, serverTime, protocol:1}` |
| `view` | `{seq, view: PlayerView}`, a full snapshot after every change. Clients drop any `seq` ≤ the last one |
| `bot.status` | `{seatId, state:'thinking'\|'idle'}` |
| `bot.say` | `{seatId, text}` |
| `error` | codes `PROTOCOL_MISMATCH BAD_TOKEN NOT_YOUR_TURN CELL_TAKEN INVALID_CLUE COLOR_WORD WRONG_PHASE RATE_LIMITED ROOM_FULL` |

```ts
PlayerView = { v:1, roomCode, mode, phase, round, totalRounds, paused, hostSeatId,
  seats:{id,name,kind,platform,score,connected,degraded?}[],
  you:string[], cueGiverSeatId, turnSeatId|null, turnDeadline|null,
  clues:string[], stones:{seatId,x,y,n:1|2}[],
  secret?:{target:{x,y}, window:{x0,y0,w:7,h:9}},   // only if you ∋ cueGiverSeatId, or phase == REVEAL
  reveal?:{target, awards:{seatId,delta,reason}[], botLine?},
  history:{round,cueGiverSeatId,target,clues}[] }
```

## B5. Rules (`docs/RULES.md`)
- Board 24×12 with x 0–23 and y 0–11, never shown. The hinge is between x 11 and 12.
- Modes:
  - `stol`: humans rotate as cue giver, Grok always guesses.
  - `ty`: a human gives clues, only Grok guesses.
  - `grok`: Grok gives clues, humans guess.
- Default 6 rounds.
- Phases: `LOBBY → SECRET_1 → GUESS_1 → SECRET_2 → GUESS_2 → REVEAL → next | GAME_OVER`.
- In GUESS phases **Grok places first**, then the human guessers in seat order. One stone per guesser per phase, and every cell holds at most one stone.
- Scoring per stone by Chebyshev distance: 0 → 3, ≤1 → 2, ≤2 → 1. The cue giver gets +1 per stone inside 3×3. ⚠️ The cue-giver rule is assumed; it lives in one function.
- Clues are letters only, ≤24 chars, 1 word / 1–2 words. Color words are blocked (PL + EN list).
- Turn timeout is 60 s online (auto-skip) and none locally.

## B6. Multiplayer flows
**Online (cross-play)**:
1. The host (web or iOS) calls `POST /rooms {local:false}` and shares the code/QR.
2. Others `POST /join` and connect over WS. Each `hello` returns `welcome` + `view`.
3. `game.start` makes the DO pick the target and send `view` with `secret` **only to the cue giver's socket**.
4. `clue.submit` → GUESS_1. A DO alarm fires after 1.2 s, Grok moves, and the server sends `bot.say`. The humans then place stones in turn.
5. SECRET_2 → GUESS_2 → REVEAL with awards → `round.next`.

Every device renders its own role. Guessers on a closed phone get the portrait table variant.

**Local pass-and-play**:
- `POST /rooms {local:true}` returns all human tokens, and one socket controls them all (`you` = all humans). That socket receives `secret`, so **the client shows it only in closed posture**. As in the design, privacy is physical here.
- The client drives the choreography from posture:
  - Viewfinder while closed.
  - After the clue: "Rozłóż telefon na stole".
  - Unfold animation → table (never renders `secret`).
  - Entering SECRET_2: "Kuba, złóż telefon".
  - REVEAL on the table → "Podaj Oli" → `round.next`.

**Robustness**:
- Clients reconnect with backoff (0.5 → 8 s) using the stored token, and `hello` returns the full view.
- The DO persists `GameState` to `ctx.storage` on every transition and restores it in its constructor (hibernation evicts memory). Each socket's seat ids are kept in `ws.serializeAttachment`.
- Per-socket rate limit: 20 msgs / 5 s.

## B7. Posture
- **iOS**: `open = width > height && width >= 700` from the root `GeometryReader`. Test with a resizable iPad simulator window (≈402×874 vs 1036×828), plus a DEBUG 3-finger-tap override.
- **Web**: `matchMedia('(horizontal-viewport-segments: 2)')` → landscape ≥900 px → a manual `F` key / "Złóż/Rozłóż" pill.
- Online mode uses posture for layout only.

---

# PART C: The four agent briefs (written verbatim to `docs/agents/*.md`)

Each brief has the same shape:
- **Role**
- **Owns** (the only paths the agent may edit)
- **Reads** (the contract)
- **Branch sequence**: each branch is one PR, with its own commits and a Done check
- **Checkpoints**
- **Rules**: the root `CLAUDE.md` §A3, plus "ask your human before touching anything outside Owns"

## C1. `P1-backend.md`: Backend + AI + protocol owner
**Owns:** `apps/server`, `apps/playtester-worker`, `packages/{game-core,protocol,playtester}`, `shared/**`, `.github/**`.
| # | Branch | Commits (small, in order) | Done when |
|---|---|---|---|
| 1 | `p1/game-core-rules` | viewfinder clamp + tests → scoring + tests → clue validator + blocklist + tests → phase machine `apply(state, action)` + tests | `pnpm --filter game-core test` green; fixtures match |
| 2 | `p1/server-room` | wrangler.toml + router + health → room codes + `POST /rooms` + `/join` → Room DO with hibernating WS + `hello/welcome` → persistence + restore → `projection.ts` + **secret-leak test** → actions wired to game-core → rate limit + Origin/CORS | `wrangler dev` + a manual WS session plays a round with no bots |
| 3 | `p1/fallback-bot` | alarm scheduler (1.2 s "thinking") → fallback guess/clue (keyword → hue/L map) → turn timeouts | full game runs with Grok seat = fallback |
| 4 | `p1/playtester` | `PlaytestClient` (WS, cid/ack, reconnect) → `casual` persona → invariants 1–7 → `smoke` + `fill` CLI → report formatter | `pnpm playtest smoke --env local` green. **Deploy to workers.dev and post the URL in `#web-server` by T+0:45** |
| 5 | `p1/grok` | `xai.ts` (structured output, 8 s timeout) → `boardText.ts` → `guess` → `clue` (validator + 2 retries) → `defend` → budget (30 calls/10 min/room → fallback + `degraded`) | `smoke --real-grok` green; Grok lines in Polish, no color words |
| 6 | `p1/playtest-cron` | worker with `crons */10` → Discord webhook → `POST /run` with secret header | green post in `#playtest-bot` |
| 7 | `p1/hardening` | `flaky` + `adversary` personas → `attack` CLI → fixes found | `pnpm playtest attack` green |

Invariants checked by the playtester:
1. No `secret` reaches a non-cue-giver socket before REVEAL.
2. `seq` strictly increases.
3. The phase order is legal.
4. Grok moves first in each GUESS phase.
5. Scores match `game-core`.
6. Every stone sits on a unique cell.
7. The game reaches GAME_OVER.

Secrets via `wrangler secret put`: `XAI_API_KEY`, `DISCORD_WEBHOOK_URL`, `PLAYTEST_TRIGGER_SECRET`.

## C2. `P2-web.md`: Web client
**Owns:** `apps/web`. **Reads:** `packages/protocol`, `shared/palette.json`, `shared/fixtures/views`, the PDF.
| # | Branch | Commits | Done when |
|---|---|---|---|
| 1 | `p2/scaffold` | Vite + React Router routes `/ /join/:code /room/:code /dev` → `tokens.css` (Cold Steel #F8F7F4, Cocoa Spice #191815, gold #E9B005, dark via `prefers-color-scheme`) → display font + logo SVG | `pnpm --filter web dev` shows routes |
| 2 | `p2/dev-gallery` | fixture loader → `/dev` renders every `views/*.json` through the real screen router | all fixtures render |
| 3 | `p2/net-store` | `api.ts` → `socket.ts` (cid/ack, backoff, seq drop, ping) → Zustand `game.ts` → token in localStorage | the lobby connects to local `wrangler dev` |
| 4 | `p2/setup-lobby` | setup (3 mode tiles, players, rounds, local/online) → lobby (seats, code, QR, "Otwórz w aplikacji") → join page | 2 tabs in the same room |
| 5 | `p2/closed-screens` | `usePosture` → Viewfinder 7×9 + brackets + stone copies → ClueEntry (inline validation) → RoundCard → GrokSecretCard → HandOff → PauseSheet | secret phases playable |
| 6 | `p2/table` | Board (CSS grid, hinge gap) → Stones → EdgeBar ×2 (one rotated 180°) → turn indicator + `bot.say` bubble → placement (click + confirm) | **T+1:15: a full round vs Grok + 2 `playtest fill` bots** |
| 7 | `p2/reveal` | RevealOverlay (dim outside 5×5, 3×3/5×5 rings, +pts) → game over | full game |
| 8 | `p2/unfold-polish` | Motion unfold (halves spring from the hinge, 220–520 ms) → clue write-on → reduced motion → Pages deploy | prod URL in `#web-server` |

## C3. `P3-ios-shell.md`: iOS app shell, networking, closed screens
**Owns:** `apps/ios/project.yml`, `apps/ios/Config/**`, `apps/ios/TintKit/**`, `apps/ios/TintAndTell/{App,Store,Screens,Posture,Resources}/**`. **Reads:** protocol, fixtures, palette, the PDF.
| # | Branch | Commits | Done when |
|---|---|---|---|
| 1 | `p3/project` | XcodeGen `project.yml` (iOS 26, Swift 6, schemes Local/Prod, URL scheme `tintandtell`, ATS local) → xcconfigs → `palette.json` + fixtures added as resources by reference → empty app | `xcodegen && xcodebuild build` ok. **Push by T+0:25, because P4 is blocked on it** |
| 2 | `p3/tintkit-models` | `Config.swift` → `Protocol/ClientMessage.swift`, `ServerMessage.swift`, `PlayerView.swift` (Codable, `type` discriminator) → swift-testing decoding all fixtures → `Palette.swift` → `Theme.swift` | `swift test` green |
| 3 | `p3/tintkit-net` | `APIClient` → `RoomClient` actor (URLSessionWebSocketTask, `AsyncStream<ServerMessage>`, cid acks, ping 20 s, backoff, seq filter) → `TokenStore` (Keychain) | connects to local `wrangler dev`, receives `view` |
| 4 | `p3/store-router` | `GameStore` (@Observable @MainActor) → `PostureReader` + DEBUG override → root router `(phase, posture, role) → screen` with a `TableView(view:onPlace:)` placeholder → server switcher | fixtures switch screens in Previews |
| 5 | `p3/setup-join` | SetupView (mode tiles with stones) → JoinView + `onOpenURL` → LobbyView | joins a room created on web |
| 6 | `p3/closed-screens` | ViewfinderView (7×9, brackets, stone copies) → ClueEntryView → RoundCardView ("Podaj Oli") → GrokSecretView (card back + seal) → HandOffView → PauseSheet (`.glassEffect`) | **T+1:45: an iOS cue giver in a web-hosted room** |
| 7 | `p3/polish` | dark mode (Cocoa Spice) → app icon light/dark → haptics on clue submit → local pass-and-play end-to-end | local full game on the iPad sim |

## C4. `P4-ios-table.md`: iOS table, board, animations
**Owns:** `apps/ios/TintAndTell/Table/**`. Exposes `TableView(view: PlayerView, onPlace: (Int, Int) -> Void)`. **Reads:** TintKit (`Palette`, `Theme`, models), fixtures.
Until P3's branch 1 merges (~T+0:25), P4 builds a throwaway Swift package locally in `apps/ios/Table-scratch`, uses `palette.json` with a local copy of the models, and rebases after that.
| # | Branch | Commits | Done when |
|---|---|---|---|
| 1 | `p4/board` | `BoardView` Canvas 288 rounded cells with the hinge gap → hit-test `point → (x,y)` → Previews from `guess1.json` | board matches the PDF in Preview |
| 2 | `p4/stones-placement` | `StoneLayer` (initials, Grok = black dot) → long-press `LoupeOverlay` (magnified 3×3) → drag adjust → release = `onPlace` → tap + confirm fallback | placement works in Preview |
| 3 | `p4/edge-bars` | `EdgeBar` bottom + top (rotated 180°): clue, scores, turn, Grok line → pause button on the hinge | matches the PDF "Pierwszy kamień" screen |
| 4 | `p4/reveal-overlay` | fade outside 5×5 (to Cocoa Spice in dark mode) → 3×3/5×5 rings → +3/+2/+1 badges → staggered appearance | matches the PDF "Odsłonięcie" screen |
| 5 | `p4/unfold` | `UnfoldTransition`: 0 ms viewfinder corners close → 180 ms seal + `.sensoryFeedback(.impact(weight:.heavy))` → 220–520 ms halves spring out from the hinge → 560–760 ms clue writes on both edges + `.selection` → Reduce Motion: 200 ms crossfade | runs on the sim |
| 6 | `p4/portrait-table` | portrait variant for online guessers on a closed phone (rotated board, pinch-zoom) | guessing works on an iPhone sim |

---

# PART D: Playtest bot (live testing at set times)
- `packages/playtester` (P1) is a headless fake-human over the real WSS protocol.
- Personas:
  - `casual`: 1–4 s delays.
  - `speedy`: 0 ms delays.
  - `flaky`: reconnects and duplicate cids.
  - `adversary`: illegal moves and forged tokens, each expecting the right `error.code`.
- **CLI**:
  - `pnpm playtest fill <CODE> --count 2 --env local` adds fake players to your room, so one developer can play a full game alone.
  - `pnpm playtest smoke --env prod [--real-grok]` plays a full game and exits non-zero on any failure.
  - `pnpm playtest attack --env local` runs the adversary persona.
- **Scheduled**: Worker `tint-playtester` with cron `*/10 * * * *`.
  - It plays a fallback-bot smoke game each run and a real-Grok game at the top of the hour.
  - The report goes to `#playtest-bot`: pass/fail, duration, Grok p50/p95, fallback count, errors.
  - `POST /run` with the secret header triggers a run on demand at the 1:15 / 1:45 / 2:30 syncs and before the demo.
  - Backup: `/loop 10m pnpm playtest smoke --env prod` in a Claude Code session.

# PART E: Tools
- **Repo / CI**: GitHub, `gh`, Projects, pnpm 9, Biome, lefthook, Actions, CODEOWNERS.
- **Shared**: TS 5, zod, culori, Vitest.
- **Backend**: Workers, Durable Objects (SQLite, Hibernation, alarms), Cron Triggers, Wrangler, xAI API.
- **Web**: Vite, React 19, React Router, Zustand, Motion, CSS Modules + vars, qrcode, Pages.
- **iOS**: Xcode 26, Swift 6, SwiftUI, Observation, URLSessionWebSocketTask, Canvas, `.glassEffect`, `.sensoryFeedback`, Keychain, swift-testing, XcodeGen, Icon Composer.
- **Debug**: Chrome DevTools (foldable emulation, WS frames), `wrangler tail`, iPad simulator.
- **Comms**: Discord voice + webhook, password manager for secrets, Claude Code (worktrees, `/loop`, `/code-review` on protocol PRs).

# PART F: Verification
- Foundation: `pnpm install && pnpm -r test && pnpm fixtures:check` is green, and `git lg` shows ~10 commits fast-forwarded onto `main`.
- Per branch: the brief's "Done when" check, plus CI green before auto-merge.
- Integration gates:
  - **T+0:45** `smoke --env prod` green.
  - **T+1:15** web full round with Grok + 2 `fill` bots.
  - **T+1:45** iOS cue giver + web guesser + 1 `fill` bot, plus local pass-and-play on the iPad sim.
  - **T+2:30** the cron report green, `attack` green, and DevTools WS frames on a guesser tab show no `secret` before REVEAL.
- History: `git lg` on `main` shows linear per-branch commit runs with milestone tags `m0…demo`.

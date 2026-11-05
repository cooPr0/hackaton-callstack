# P2 Web app: detailed implementation plan

## Context
The Foundation and the docs are merged on `main` (`9381bbc`, PR #2). PR #2 was merged with a merge commit; set the repo to rebase-merge only so the per-commit history stays linear.

Paweł is P2 and owns `apps/web/**`. The web client must:
- host and join online rooms;
- play local pass-and-play in one browser with fold emulation;
- cross-play with iOS;
- render every screen from the design PDF (pages 3–4).

It does this against the contract in `packages/protocol` and the golden fixtures in `shared/fixtures`.

Decisions:
- **This session orchestrates both lanes.** Lane A (data, networking, flow) runs here. Lane B (screens, table, animations) is a background agent in its own git worktree that I brief, review and merge.
- **Hosting**: Cloudflare Pages project `tint-and-tell`.

Existing pieces to reuse (don't rewrite):
- `@tint/protocol` provides:
  - all zod schemas and types: `PlayerView`, `ClientMessage`, `ServerMessage`, `CreateRoomRequest/Response`, `JoinRoom*`, `HealthResponse`, `ErrorCode`;
  - helper `wsPath(code, token)`;
  - constants: `BOARD_COLS/ROWS`, `HINGE_AFTER_X`, `VIEWFINDER_W/H`, `CLUE_MAX_CHARS`, `CLUE_MAX_WORDS`, `PING_INTERVAL_MS`, `COLORS`, `PROTOCOL_VERSION`.
- `shared/palette.json` (288 cells, row-major, `{x,y,hex,L,C,h,descriptor}`). Its type is `Palette` from `@tint/game-core` (type-only import, so culori doesn't end up in the bundle).
- `shared/fixtures/views/*.json`: 10 per-phase views (lobby, secret1-cuegiver, secret1-guesser, guess1, secret2-cuegiver, guess2, reveal, gameover, local-guess1, grok-secret1).
- `packages/protocol/scripts/fixtures.ts` → `secretLeak(view)`, reused in web tests.
- Pre-installed in `apps/web/package.json`: react 19, react-dom, react-router 8, zustand 5, motion 14, qrcode, vite 8, @vitejs/plugin-react, vitest 5.

---

## 0. First step after approval
`git switch main && git pull --rebase`. The local checkout is still on the merged `p2/readme-pitch` branch. Then `git switch -c p2/scaffold` from fresh `main`. The stale local branches (`foundation`, `p2/readme-pitch`) are kept; I'll list them for Paweł to delete, because I don't delete anything myself.

## 1. Contract gaps to settle with P1 at kickoff (one GitHub issue, label `protocol`, plus voice)
1. **Local multi-seat WS auth**: a local room returns N tokens, but `wsPath` takes one.
   - Proposal (additive): the WS accepts repeated `token` params (`?token=a&token=b`), and the socket controls the union of seats.
   - P1 adds `wsPath(code, tokens: string | string[])`. **P3 must know about this too.**
2. **Stop reconnect loops**: on `BAD_TOKEN` / `PROTOCOL_MISMATCH`, the server sends `error`, then closes with code **4401 / 4426**. The client treats those as fatal.
3. **Join renames the seat**: `POST /join {name}` overwrites the placeholder name ("Gracz 2").
4. **CORS / WS Origin allowlist**: `http://localhost:5173`, `http://<LAN-IP>:5173`, `https://tint-and-tell.pages.dev`, `https://*.tint-and-tell.pages.dev` (preview deploys).
5. **Cloudflare Pages access** for Paweł: an account member, or a scoped API token kept in env and never committed.

Until (1) lands, local mode uses mock mode (`?mock=1`), and online mode uses one token.

---

## 2. Setup (`p2/scaffold`)
- `apps/web/vite.config.ts`:
  - `@vitejs/plugin-react`
  - alias `@shared` → `../../shared`
  - `server: { host: true, port: 5173, fs: { allow: ['../..'] } }`
  - `test: { environment: 'node' }` (no DOM deps, so the tests stay pure)
- `tsconfig.json`: extends `../../tsconfig.base.json`; `lib: [ES2023, DOM, DOM.Iterable]`, `jsx: react-jsx`, `types: [vite/client]`, `paths: { "@shared/*": ["../../shared/*"] }`.
- Scripts: `dev`, `build` (`tsc -p . && vite build`), `preview`, `typecheck`, `test`, `deploy` (`wrangler pages deploy dist --project-name tint-and-tell`).
- Dependency added: `wrangler` as a devDependency, at the version already in the lockfile, so the diff stays tiny.
- `.env.example`: `VITE_API_URL=http://localhost:8787`. Commit `.env.production` with the prod API URL; it isn't secret.
- `index.html`:
  - a CSP meta (`default-src 'self'; connect-src 'self' <api> <wss api>; font-src 'self' fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src 'self' data:`)
  - Polish `lang="pl"`
  - `theme-color` for both schemes
  - the favicon from the logo SVG

## 3. Source layout (`apps/web/src`)
| Path | Lane | Purpose |
|---|---|---|
| `main.tsx`, `app/App.tsx` | A | router (`createBrowserRouter`): `/`, `/join/:code`, `/room/:code`, `/dev`, `*` |
| `app/actions.ts` | A | **Seam 1**: `interface WebActions { submitClue(text); place(x,y); next(); pause(p); end(); start(); revealSecretFor(seatId) }` |
| `app/selectScreen.ts` (+test) | A | **Seam 2**: `(view, posture, local, ui) → ScreenId` (§5) |
| `app/publicView.ts` (+test) | A | strips `secret` unless the phase is REVEAL/GAME_OVER. **The table always gets `publicView(view)`** |
| `app/roles.ts` (+test) | A | `isCueGiver`, `isMyTurn`, `actingSeat(view)`, `seatName`, `turnName`, `scoresLine` |
| `app/config.ts` | A | `API_URL`, `wsUrl(code, tokens)` (http→ws) |
| `net/api.ts` (+test) | A | `health()`, `createRoom()`, `joinRoom()`: fetch + `AbortSignal.timeout(8000)`, zod parse, `ApiError{status, code}` |
| `net/socket.ts` (+test) | A | `RoomSocket` (§4), with an injectable WebSocket constructor for tests |
| `net/mock.ts` | A | mock mode: a fake socket that steps through the fixtures and applies intents locally (demo/dev only) |
| `store/game.ts` (+test) | A | Zustand store (§4) |
| `store/tokens.ts` | A | `localStorage` `tint:room:<CODE>` → `{seats:[{seatId,token}], local, createdAt}`, every access in try/catch |
| `posture/usePosture.ts`, `posture/PostureToggle.tsx` | A | §8 |
| `routes/SetupPage.tsx`, `JoinPage.tsx`, `RoomPage.tsx`, `DevGallery.tsx`, `NotFound.tsx` | A | pages. RoomPage = store → `selectScreen` → `registry` |
| `screens/registry.ts` | **B** | `Record<ScreenId, ComponentType<ScreenProps>>`, where `ScreenProps = { view, actions, posture, ui }` |
| `screens/*` | B | Lobby, Secret (viewfinder + clue entry), GrokSecret, HandOff (fold/unfold/pass), RoundCard, GameOver, PauseSheet, RulesSheet, Connecting |
| `table/*` | B | `Table`, `Board`, `Cell`, `Stone`, `EdgeBar`, `Placement`, `RevealLayer`, `Unfold`, `geometry.ts` (+test) |
| `components/*` | B | `Logo` (Dwa T), `Wordmark`, `Button`, `Chip`, `Sheet`, `Toast`, `Swatch`, `Brackets`, `DisplayInput`, `HingeIcon`, `ScoreRow` |
| `theme/tokens.css`, `global.css`, `useTheme.ts` | A (scaffold) → B | tokens, light/dark |
| `i18n/pl.ts`, `i18n/errors.ts` | A | all UI copy in one place; `ErrorCode` → Polish message; `plural(n, ['kamień','kamienie','kamieni'])` |
| `palette/palette.ts` | A | typed `palette.json` import, `cellAt(x,y)`, `hexAt` |

Ownership inside `apps/web` keeps the two lanes conflict-free. Lane A never edits `screens/`, `table/` or `components/`. Lane B never edits `app/`, `net/`, `store/`, `routes/` or `posture/`. Seam changes go through SendMessage.

---

## 4. Data layer (Lane A)
**`RoomSocket`** (a small state machine: `idle → connecting → open → reconnecting → closed | failed`):
- `connect(code, tokens[])` → `new WebSocket(wsUrl)`. On `open` it sends `hello {pv:1, platform:'web', name}`.
- `send(msg)` adds `cid = crypto.randomUUID()` and returns a Promise. It resolves on `ack{cid}`, rejects on `error{cid}` with an `ApiError(code)`, and times out after 5 s.
- Every inbound frame is parsed with `ServerMessage.safeParse`. Invalid frames are logged and dropped.
- A `view` with `seq ≤ lastSeq` is dropped. `lastSeq` resets when the server sends `welcome`.
- `ping` every `PING_INTERVAL_MS` while open.
- Reconnect backoff is 500 ms·2ⁿ with ±20% jitter, capped at 8 s. It retries until either close code 4401/4426 arrives (→ `failed`, fatal) or 10 consecutive attempts fail without reaching `open` (→ `failed`, with a "Połącz ponownie" button).
- `close()` is intentional and doesn't reconnect.

**Store (`useGame`)**:
- State:
  - `code`, `local`, `creds`
  - `view: PlayerView | null`, `conn`
  - `pending: Record<cid, type>`
  - `lastError: {code, message, at} | null`
  - `bot: {seatId, state, line?, lineAt?}`
  - `ui: { secretUnlockedFor: string | null, pauseOpen, rulesOpen }`
  - `postureOverride: 'open' | 'closed' | null`
  - `mock: boolean`
- Intents (they never compute rules):
  - `createRoom(form)` → `api.createRoom` → save tokens → `navigate('/room/CODE')`
  - `joinRoom(code, name)`
  - `connect(code)`, which reads the tokens
  - `start()`
  - `submitClue(text)`, which sends `seatId = view.cueGiverSeatId` (must be in `you`)
  - `place(x, y)`, which sends `seatId = view.turnSeatId` (must be in `you`)
  - `next()`, `pause(bool)`, `end()`
  - `revealSecretFor(seatId)`, the local "Jestem Olą" gate
  - `leave()`
- Error handling: the store maps `ErrorCode` → a Polish toast via `i18n/errors.ts`. Buttons are disabled while their cid is pending.
- **Mock mode** (`?mock=1` or `/dev`): `net/mock.ts` replaces the socket. It steps through the fixture sequence and fakes Grok's `bot.status` and `bot.say`. It's used by Lane B and as a fallback if P1 is late.

---

## 5. Screen selection (`selectScreen`, unit-tested against every fixture)
Values used below:
- `C`: you hold the cue-giver seat.
- `G`: the cue giver is Grok.
- `posture`: `open | closed`.
- `local`: `view.local`.
- `ScreenId` is one of `connecting | lobby | pass | secret | grok-secret | handoff-fold | handoff-unfold | table | round-card | game-over`.

| Phase | Online | Local (one device) |
|---|---|---|
| no view | `connecting` | `connecting` |
| LOBBY | `lobby` | `lobby` |
| SECRET_n, human cue giver | C → `secret`; others → `table` (waiting state, "Kuba wymyśla podpowiedź…") | closed: `ui.secretUnlockedFor ≠ cueGiver` → `pass` ("Podaj Kubie" + "Jestem Kubą, pokaż odcień"), else `secret`. Open → `handoff-fold` ("Kuba, złóż telefon") |
| SECRET_n, G | closed → `grok-secret`, open → `table` (waiting) | closed → `grok-secret` ("Rozłóż telefon…"), open → `table` (waiting) |
| GUESS_n | `table` (closed posture = portrait variant) | open → `table`; closed → `handoff-unfold` ("Rozłóż telefon na stole") |
| REVEAL | `table` + reveal layer + "Następna runda" | open → `table` + reveal; closed → `round-card` (swatch, clues, scores, "Dalej" → `next()`) |
| GAME_OVER | `game-over` | `game-over` |

- `paused` → `PauseSheet` overlays any screen.
- **Privacy rule (tested)**:
  - The `table` and `round-card` components receive `publicView(view)`. `round-card` only appears in REVEAL, where `secret` is public anyway.
  - Only the `secret` screen reads `view.secret`.
  - `secretUnlockedFor` resets whenever `round` or `cueGiverSeatId` changes, so the next player has to tap "Jestem X" before seeing anything.
- Expected mapping for the fixtures (test table): `secret1-cuegiver` → `secret`; `secret1-guesser` → `table`; `guess1` → `table`; `local-guess1` closed → `handoff-unfold` and open → `table`; `grok-secret1` closed → `grok-secret`; `reveal` → `table`; `gameover` → `game-over`; `lobby` → `lobby`.

---

## 6. Screens (Lane B): copy and layout follow PDF page 3
- **Setup** (`/`, built by Lane A because it holds form state; the visual components come from Lane B):
  - "Nowa partia" + a mini palette strip (palette rows 0–2).
  - 3 mode tiles: Stół / Ty podpowiadasz / Grok podpowiada. Each has a 2×2 swatch and stone icons; the selected tile is dark with a check.
  - Player chips (K, O, a Grok black chip, "+ Dodaj") with editable names.
  - "6 rund · ok. 20 min" stepper.
  - A toggle "Jeden telefon / Każdy na swoim" (local vs online).
  - Primary button "Losuj odcień dla ‹first cue giver›" (local) / "Utwórz pokój" (online).
- **Lobby**:
  - The room code in huge display type.
  - A QR (`qrcode` → data URL) of `${origin}/join/CODE`, plus "Otwórz w aplikacji" (`tintandtell://join/CODE`).
  - Seats with a platform icon and connected dot.
  - "Start" (host only, enabled once ≥ 2 participants).
- **Join**: the code (prefilled from the URL), a name input, then "Dołącz".
- **Secret**:
  - Header "Runda 3 z 6 · patrzy tylko Kuba" + pause.
  - A 7×9 viewfinder of palette cells from `secret.window`, with corner brackets on the target and stone copies in SECRET_2 ("Oba kamienie w kadrze · Było: Rosół").
  - Label "Pierwsza podpowiedź, jedno słowo" / "Druga podpowiedź, do dwóch słów".
  - A `DisplayInput` (huge, with a blinking caret) and the helper "Bez nazw kolorów i bez pozycji na planszy."
  - Client pre-check: letters and spaces, ≤24 chars, word count. The color-word check stays on the server (`COLOR_WORD` toast).
  - Footer: local → "Rozłóż telefon na stole" with a hinge icon (sending is automatic on Enter); online → a "Wyślij" button.
- **GrokSecret**: a tilted black card with a seal, "Grok zna odcień", the quote ("Mam. Będzie bolało, ale krótko."), and "Nikt nie musi patrzeć. Rozłóż telefon…".
- **HandOff** (3 variants): pass / fold / unfold, each with a big name, a hinge icon and one action.
- **RoundCard**: a top 60% swatch, a black strip "Odcień Kuby · 4 kamienie w domu" + "Rosół, z marchewką", the score line "Ola 10 · Grok 8 · Kuba 6", "Runda 4 z 6", and a "Dalej" button.
- **PauseSheet**: a bottom sheet with a frosted panel (`backdrop-filter: blur(24px) saturate(1.4)`).
  - "Pauza" + "Runda 3 z 6 · Ola 7, Grok 6, Kuba 5".
  - Actions: Wznów grę, Zasady podpowiedzi (opens RulesSheet), Zakończ partię (red, host only, with a confirm).
  - "Przekaż rolę dalej" is dropped because there is no protocol action for it.
- **GameOver**: the winner in huge type, the final scores, and history cards (swatch + clues per round) via `history`. Buttons: "Nowa partia" and "Rewanż" (prefills the setup).

## 7. Table (Lane B)
- **Board**: one CSS grid, `grid-template-columns: repeat(12, 1fr) var(--hinge) repeat(12, 1fr)`, with 12 rows.
  - Two half-boards are grid items using **`subgrid`**, so each half is a real element the unfold animation can move. Rings span the parent grid and cross the hinge track correctly.
  - Cells are `<button>`s with the palette hex as background, `aria-label="Kratka ${x+1}, ${y+1}"` (screen readers only), radius 4px and a 3px gap; the hinge track is 3× the gap.
  - Sizing: `container-type: size`, then the board width is `min(100cqw, 100cqh * 24.6/12)`.
- **Stones**: rendered inside the cell.
  - Humans: a white disc with the initial and a dark ring.
  - Grok: a dark disc with a light dot.
  - n = 2 stones get a double ring.
  - On mount: a drop with a spring (scale 1.4 → 1, opacity 0 → 1).
- **Placement**: enabled only when `isMyTurn`; occupied cells are disabled.
  - Mouse: hover outline → click selects → a confirm chip next to the cell ("Postaw") or Enter.
  - Touch: tap selects, a 2nd tap or the confirm chip places.
  - Keyboard: arrows move the selection, Enter places.
  - A pending state is shown until the next `view`.
- **EdgeBar** ×2 (the top one has `rotate(180deg)`):
  - Left: "Podpowiedź Kuby · pierwszy kamień" + the clue(s) in display type.
  - Right: Grok's line (`Grok: „…”`) and scores (big numbers, name labels).
  - The turn label "Twój ruch, Ola" / "Ruch: Grok…" (with a thinking pulse).
  - Pause buttons at the hinge x, top and bottom.
- **Waiting state** (SECRET for guessers): the board at 60% opacity, with the edge bar text "Kuba wymyśla podpowiedź…".
- **Reveal**:
  - Each cell gets `data-zone` = `exact | near | far | out` from `geometry.zone(x, y, target)`.
  - `out` cells animate toward the background color: Cold Steel in light mode, Cocoa Spice in dark (`color-mix` to 85%), staggered by distance.
  - The 3×3 ring is solid and the 5×5 ring dashed (grid items spanning the target ± 1 / ± 2, clamped to the board).
  - "+3 / +2 / +1" badges pop next to the stones, staggered.
  - The edge bars switch to "Odcień Kuby" + clues + `botLine` + deltas "Ola +4 · Grok +3 · Kuba +2".
- **Portrait variant** (online + closed posture): the board wrapper is rotated 90° and fitted to the width, with one edge bar. Hit-testing still works because the cells are real elements.

## 8. Posture (`usePosture`)
1. `matchMedia('(horizontal-viewport-segments: 2)')`: open, with hinge x from `env(viewport-segment-right 0 0)`.
2. Otherwise `(orientation: landscape) and (min-width: 900px)`: open.
3. Overrides:
   - the `postureOverride` from the store;
   - the `F` key toggles it (ignored while an input has focus);
   - a floating `PostureToggle` pill ("Złóż / Rozłóż"), shown in local mode, in `/dev`, or with `?debug`.
- Returns `{ posture, hingeX, source }` and listens to `change` on every query.

## 9. Motion (Lane B, `motion/react`, all behind `useReducedMotion()` → 200 ms crossfade)
- **Unfold**: plays on closed → open in local mode, or on SECRET → GUESS online. The PDF timeline:
  - 0–180 ms: the viewfinder corners close.
  - 180 ms: the seal (a black square scales in).
  - 220–520 ms: the halves animate `x: ∓50% → 0` (spring, duration 0.5, bounce 0.15). **No zoom toward the target.**
  - 560–760 ms: the clue writes on, letters staggered 25 ms, on both edges.
- **Stone drop**, **reveal stagger** (`delay = distance * 40ms`), **ring draw** (SVG `stroke-dashoffset`), **badge pop**.
- **Sheet**: spring up from the bottom. **Toast**: slide from the top edge.

## 10. Theme, type, copy
- `tokens.css` (`:root` + `[data-theme=dark]` + a `prefers-color-scheme` fallback):
  - `--bg` #F8F7F4 / #191815, `--fg` inverse
  - `--muted` #6B6963 / #A3A097, `--line` rgba(fg, .12)
  - `--gold` #E9B005, `--danger` #D1242F
  - `--radius-card` 20px, `--radius-cell` 4px
  - spacing scale 4/8/12/16/24/32/48
  - `--hinge` 10px
- Fonts:
  - Display: Archivo (Google Fonts, `wdth 125, wght 800`) as the stand-in for the PDF's wide grotesk.
  - Body: `system-ui, -apple-system, "Inter", sans-serif`.
  - The `p2/unfold-polish` branch self-hosts the woff2 in `public/fonts`, so the demo works on bad venue Wi-Fi.
- All copy lives in `i18n/pl.ts`. No hard-coded strings in components.

### Wide windows (laptop, desktop, open fold)
The PDF only shows the phone. On wide windows the web keeps the same identity but a different composition, so it doesn't read as a phone screen floating in empty space.
- **Breakpoint**: 900 px wide, the same as `OPEN_SHAPE_QUERY`. Below it, every page and closed screen is the phone column, pixel-identical to the design.
- **Sizes** (`theme/layout.css`): `--page-max` 1120 px, `--col-form` 440 px, `--gutter-wide` 48 px, `--split-gap` 64 px. Colours stay in `tokens.css`; no new colours.
- **Two panes**: the visual on the left (display type, the palette board, QR, viewfinder) and the controls on the right (form, list, primary pill). The primary pill is never wider than `--col-form`.
- **Routes** (`/`, `/join/:code`, `*`) use `@media (min-width: 900px)`; they always fill the window. The left pane shows the title, `t.tagline` and `PaletteHero`, the full 24 × 12 board with the hinge seam (decorative, nothing from a round).
- **Closed screens** use `@container` queries on `ClosedLayout`, so the `/dev` gallery's 1036-wide frames show the wide variant too.
- **Table**: no split. It keeps the full-width board and two edge bars. `PauseSheet` stays a bottom sheet (max 464 px) everywhere.
- The typeset `Wordmark` is a stand-in and is not used as a hero; use `Logo`.

## 11. Security, accessibility, performance
- The secret is only rendered by `secret`. `publicView` is enforced and unit-tested with `secretLeak`.
- No `console.log(view)` in production builds (`import.meta.env.DEV` guard).
- Tokens live in localStorage (accepted for a hackathon), with the CSP above. React escapes all user strings. Names are capped at 24 chars.
- Focus-visible rings, real buttons, `aria-live` for turn changes and Grok lines, a 4.5:1 text contrast (the tokens give 16.6:1).
- Performance: the 288 cells are memoized, and only `data-*` attributes change per view. The board cell component is `memo` keyed by `(hex, stone, zone, selected)`.

---

## 12. Orchestration: me (Lane A) + a background agent (Lane B)
**Prerequisite**: Paweł runs `gh auth login` and sets the repo to **rebase-merge only** plus auto-merge. Without gh auth, I push branches and Paweł opens the PRs.

1. I build `p2/scaffold` and `p2/dev-gallery` here, open the PRs, and rebase-merge them. Those two branches create the seams (`actions.ts`, `registry.ts` stub, `selectScreen.ts`, fixtures in `/dev`, mock mode).
2. **Spawn Lane B**: the `Agent` tool (general-purpose, `isolation: "worktree"`, background) with a self-contained brief covering:
   - this plan's §3 ownership, §6, §7, §9, §10;
   - the commit conventions from `CLAUDE.md`;
   - "work in `apps/web/src/{screens,table,components,theme}` only; verify every screen in `/dev?mock=1` with chrome-devtools screenshots against the PDF; after each branch: run checks, push the branch, then report the branch name + a summary and STOP".
3. When Lane B reports, I review the diff, run the checks, open the PR and rebase-merge it. I then `SendMessage` the agent: "rebase on origin/main, start the next branch". Its sequence: `p2/closed-screens` → `p2/table` → `p2/reveal` → `p2/unfold-polish`.
4. Seam changes (a new `WebActions` method, `ScreenProps` field or `ScreenId`) are mine. I make them in Lane A, merge, then SendMessage Lane B to rebase.
5. Worktrees are left in place (no deleting files). At the end I list the worktree paths for Paweł to remove.

### Branches → commits (Conventional Commits, scope `web`, `Co-Authored-By` trailer)
**Lane A (this session)**
- `p2/scaffold`:
  1. `docs(web): detailed web design` (this plan → `docs/web/PLAN.md`)
  2. `chore(web): vite, react, tsconfig, scripts, env example`
  3. `feat(web): router with page placeholders`
  4. `feat(web): design tokens, light/dark theme, fonts`
  5. `feat(web): Dwa T logo and wordmark`
  6. `feat(web): typed palette loader`
  7. `feat(web): Polish copy and error messages`
  8. `feat(web): WebActions, ScreenId and screen registry stub`
  9. `test(web): palette and copy smoke tests`
- `p2/dev-gallery`:
  1. `feat(web): roles and publicView helpers + tests`
  2. `feat(web): selectScreen + fixture-driven tests`
  3. `feat(web): fixture loader via import.meta.glob`
  4. `feat(web): /dev gallery with posture and theme toggles`
  5. `feat(web): posture hook and toggle pill`
  6. `feat(web): mock socket stepping through fixtures`
- `p2/net-store`:
  1. `feat(web): config and HTTP api client + tests`
  2. `feat(web): RoomSocket with cid/ack and seq filter`
  3. `feat(web): reconnect backoff, ping, fatal close codes`
  4. `test(web): RoomSocket against a fake WebSocket`
  5. `feat(web): token storage per room`
  6. `feat(web): zustand game store and intents + tests`
- `p2/setup-lobby`:
  1. `feat(web): setup page form state and create room`
  2. `feat(web): join page`
  3. `feat(web): RoomPage wiring store → selectScreen → registry`
  4. `feat(web): connection banner and reconnect button`
- `p2/wire-game` ⏰ T+1:15:
  1. `feat(web): screen actions → store intents`
  2. `feat(web): error toasts`
  3. `feat(web): bot thinking and bot line plumbing`
  4. `fix(web): …` (issues from the first real round)
- `p2/deploy`:
  1. `chore(web): pages deploy script and production env`
  2. `docs(web): apps/web/README (env, dev, deploy)`

**Lane B (background agent)**
- `p2/closed-screens`: Button/Chip/Sheet/Toast/Swatch/Brackets/DisplayInput → Lobby (QR) → Secret (viewfinder + clue entry + SECRET_2 stone copies) → GrokSecret → HandOff ×3 → RoundCard → PauseSheet + RulesSheet → GameOver → Connecting → register all in `registry.ts`.
- `p2/table`: `geometry.ts` + tests (zones, ring spans, hinge track index, viewfinder cells) → Board with subgrid halves → Cell → Stone → Placement (mouse, touch, keyboard) → EdgeBar ×2 → waiting state → portrait variant.
- `p2/reveal`: data-zone dimming → rings → badges → reveal edge bars + "Następna runda".
- `p2/unfold-polish`: unfold timeline → clue write-on → stone drop → reduced motion → dark-mode pass → mobile pass → self-hosted fonts.

Expected total: about 60 web commits.

---

## 13. Collaboration with P1, P3 and P4 (other machines, through humans and git)
| When | What | Channel |
|---|---|---|
| T+0:15 | §1 gaps issue → P1 (cc P3 for multi-token) | GitHub issue `protocol` + voice |
| T+0:45 | P1's deployed URL → `apps/web/.env.production`; start real-server testing | `#web-server` |
| T+1:00 | ask P1 for `pnpm playtest fill` | voice |
| T+1:15 | gate: web online round vs Grok + 2 fill bots → tag `m1-web-round` (P1 tags) | sync |
| T+1:45 | gate: iOS joins the web-hosted room via QR → `m2-crossplay` | sync |
| after deploy | Pages URL → P1 allowlist; post in `#web-server` for P3/P4 testing | issue + Discord |
| any protocol change | `#protocol` notice → I rebase, `pnpm install && pnpm fixtures:check`, update the screens, SendMessage Lane B | — |

Server bugs go to P1 as an issue with the WS frame JSON copied from DevTools. I never edit P1, P3 or P4 paths.

## 14. Timeline
| T | Lane A (me) | Lane B (agent) |
|---|---|---|
| 0:15–0:40 | scaffold, dev-gallery, §1 issue | — |
| 0:40–1:05 | net-store | closed-screens (mock mode) |
| 1:05–1:15 | setup-lobby, wire-game | table |
| 1:15–1:45 | cross-play fixes, deploy | reveal |
| 1:45–2:30 | bug bash with real devices | unfold-polish |
| 2:30–2:45 | freeze; record the backup demo video | — |

---

## 15. Verification
- **Unit** (`pnpm --filter @tint/web test`, node env):
  - `selectScreen` fixture × posture × local table
  - `publicView` + `secretLeak` on every fixture
  - `roles`
  - `geometry` (zones, rings clamped at the corners, hinge track)
  - `RoomSocket` with a fake WS and `vi.useFakeTimers()`: hello on open, ack/error by cid, ack timeout, stale-seq drop, backoff schedule, fatal 4401, ping
  - `api` with mocked fetch
  - store intents use the right `seatId`
  - `plural()`
- **CI**: `pnpm -r typecheck && pnpm -r test && pnpm fixtures:check && biome ci`.
- **Visual** (chrome-devtools MCP, done by me and Lane B):
  - `/dev?mock=1` → `take_screenshot` for every fixture at 402×874 and 1036×828 (`resize_page`), light and dark (`emulate` color scheme), compared with PDF pages 3–4.
  - `list_console_messages` must be empty.
- **Integration** (after P1's deploy):
  - Two Chrome pages (`new_page`) join the same online room, plus `pnpm playtest fill <CODE> --count 1`, and play 2 full rounds.
  - On the guesser page, `list_network_requests` / DevTools WS frames show no `secret` before REVEAL.
  - Kill the network for 5 s mid-turn and confirm it resumes on the same seat.
- **Local mode**: one page; the `F` toggle drives pass → secret → unfold → table → fold → secret → unfold → reveal → round-card. The secret is never visible while "open".
- **Cross-play**: the iPhone joins via the QR on the Pages URL. The iOS cue giver's clue appears on web.
- **Lighthouse** (lighthouse MCP) on `/` and `/room` mock: accessibility ≥ 90, no CSP violations.

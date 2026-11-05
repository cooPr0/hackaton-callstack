# P2 Web: execution plan (commits, lanes, collaboration)

This plan refines `docs/agents/P2-web.md`. The brief says **what** to build. This file says **in which commits**, **in which parallel lane**, and **how we talk to the other three agents**.

Owner: Paweł (P2). The code lives only in `apps/web/**`.

---

## 1. Two lanes, two Claude sessions
The web work splits cleanly into two halves that only touch through one file. So two Claude sessions run in parallel on Paweł's machine:

| Lane | Session | Worktree | Owns inside `apps/web/src` | Builds |
|---|---|---|---|---|
| **A: data & flow** | this session | `~/Projects/hackaton-callstack` | `net/`, `store/`, `routes/`, `posture/`, `app/` | scaffold, net/store, setup & lobby, wiring, deploy |
| **B: screens** | 2nd session | `~/Projects/tint-web-ui` (`git worktree add`) | `screens/`, `table/`, `components/`, `theme/` (after scaffold) | closed screens, table, reveal, unfold animation |

- **Seam 1**: every screen is a pure component `({ view, actions }) => JSX`, where `view: PlayerView` and `actions: WebActions` (an interface defined in `src/app/actions.ts` during scaffold). Lane B develops entirely against `shared/fixtures/views/*.json` in `/dev` and never needs the server.
- **Seam 2**: `src/app/selectScreen.ts` is a pure function `(view, posture, local) → ScreenId`, with unit tests. Lane A writes it. Lane B only adds entries to `src/screens/registry.ts` (`ScreenId → component`).

Start lane B (after `p2/dev-gallery` merges):
```bash
git worktree add ../tint-web-ui -b p2/closed-screens origin/main
cd ../tint-web-ui && pnpm install
claude "Read CLAUDE.md, docs/agents/P2-web.md and docs/web/PLAN.md. You are P2 lane B. Do branches p2/closed-screens → p2/table → p2/reveal → p2/unfold-polish in order. Only edit apps/web/src/{screens,table,components,theme}/**."
```
The sessions don't edit the same files, so they coordinate through git (rebase on `main` before each PR). Lane A can reach lane B with `SendMessage` (`ListAgents` shows its name) for seam changes, for example a new field on `WebActions`.

---

## 2. Branches → commits
Every commit builds and passes `pnpm --filter @tint/web typecheck test`. The scope is always `web`, and each message ends with the `Co-Authored-By` trailer. Each branch is one PR, rebase-merged.

### Lane A
**`p2/scaffold`** (T+0:15 → 0:30)
1. `chore(web): vite + react 19 + tsconfig + scripts` (`dev`, `build`, `preview`, `typecheck`, `test`; `@vitejs/plugin-react`; `server.host = true` so phones on the LAN can open it)
2. `feat(web): routes / /join/:code /room/:code /dev with placeholders`
3. `feat(web): design tokens, light/dark theme, base styles` (`theme/tokens.css`: Cold Steel / Cocoa Spice / gold; `prefers-color-scheme` + `data-theme`)
4. `feat(web): display font and Dwa T logo + wordmark` (OFL stand-in; inline SVG, right T rotated 180°)
5. `feat(web): palette loader from shared/palette.json`
6. `feat(web): WebActions interface and screen registry stub` (seam 1)
7. `test(web): palette and registry smoke tests`

**`p2/dev-gallery`** (0:30 → 0:40)
1. `feat(web): load view fixtures via import.meta.glob`
2. `feat(web): selectScreen(view, posture, local) + unit tests` (seam 2; one test per fixture)
3. `feat(web): /dev gallery grid with posture + theme toggles`
4. `feat(web): /dev fixture stepper (prev/next phase) for click-through demos`

→ **Lane B starts here.**

**`p2/net-store`** (0:40 → 1:00)
1. `feat(web): env config and HTTP api client (create/join/health)` (`VITE_API_URL`, responses parsed with zod; commit `.env.example`)
2. `feat(web): websocket client with cid/ack and seq filter`
3. `feat(web): reconnect with backoff and keepalive ping`
4. `feat(web): zustand game store with intents`
5. `feat(web): persist seat tokens per room in localStorage`
6. `test(web): socket client against a fake WebSocket` (drop on stale seq, ack timeout, reconnect sends hello)
7. `feat(web): mock mode (?mock=1) driving the store from fixtures`. A fallback if the server is late. Lane B uses it too.

**`p2/setup-lobby`** (1:00 → 1:10)
1. `feat(web): setup screen (mode tiles, players, rounds, local/online)`
2. `feat(web): create room and navigate to /room/:code`
3. `feat(web): lobby with seats, big code and QR` (QR → `${origin}/join/CODE`; deep link `tintandtell://join/CODE`)
4. `feat(web): join page`
5. `feat(web): RoomPage wires store → selectScreen → registry`
6. `feat(web): posture hook (viewport segments → aspect → F key)`

**`p2/wire-game`** (1:10 → 1:15) ⏰ **gate `m1-web-round`**
1. `feat(web): connect screen actions to store intents`
2. `feat(web): error toasts mapped from protocol error codes` (PL copy)
3. `feat(web): bot thinking indicator and bot.say bubble`
4. `fix(web): …` (whatever the first real round exposes)

**`p2/deploy`** (1:45 → 2:00)
1. `chore(web): cloudflare pages config and deploy script`
2. `docs(web): env + deploy notes in apps/web/README.md`

### Lane B
**`p2/closed-screens`** (0:40 → 1:05)
1. `feat(web): Viewfinder 7×9 with target brackets`
2. `feat(web): Viewfinder stone copies for SECRET_2`
3. `feat(web): ClueEntry with inline 1-word / 2-word validation`
4. `feat(web): RoundCard with swatch, clues and hand-off`
5. `feat(web): GrokSecretCard (card back + seal)`
6. `feat(web): HandOff fold/unfold prompts`
7. `feat(web): PauseSheet`

**`p2/table`** (1:05 → 1:15)
1. `feat(web): Board grid 24×12 with hinge gap`
2. `feat(web): Stones layer (initials, Grok black dot)`
3. `feat(web): click-select + confirm placement`
4. `feat(web): EdgeBar bottom + mirrored top`
5. `feat(web): turn indicator and Grok line on edge bars`

**`p2/reveal`** (1:15 → 1:35)
1. `feat(web): reveal fade outside 5×5`
2. `feat(web): 3×3 and 5×5 rings`
3. `feat(web): +points badges from awards`
4. `feat(web): game over screen with history cards`

**`p2/unfold-polish`** (1:45 → 2:25)
1. `feat(web): unfold timeline (seal → halves spring from hinge → clue write-on)`
2. `feat(web): reduced-motion crossfade`
3. `fix(web): dark mode pass on all screens`
4. `fix(web): mobile layout pass (phone guesser = portrait table)`

Expected total: **about 45–55 web commits**, all visible on `main`.

---

## 3. Timeline & gates
| T | Lane A | Lane B | Gate |
|---|---|---|---|
| 0:15–0:40 | scaffold, dev-gallery | — | |
| 0:40–1:10 | net-store, setup-lobby | closed-screens, table | P1 server deployed (0:45) |
| 1:10–1:15 | wire-game | table done | **m1-web-round**: full online round vs Grok + 2 `playtest fill` bots |
| 1:15–1:45 | cross-play fixes with iOS | reveal | **m2-crossplay**: iOS cue giver + web guesser |
| 1:45–2:30 | deploy, bug fixes | unfold-polish | **m3-freeze** |
| 2:30–3:00 | record backup demo video, pitch | — | demo |

If P1 is late: switch to `?mock=1` and keep building. Never wait.

---

## 4. Collaboration with the other agents (P1, P3, P4)
The other agents run on teammates' machines. They are reachable **only** through their humans (voice / Discord) and through **git artifacts**. Make every request concrete: file, field, why.

| I need | From | How | When |
|---|---|---|---|
| Deployed server URL | P1 | `#web-server` post | T+0:45 |
| Pages origin in `ALLOWED_ORIGINS` (CORS + WS Origin check) | P1 | GitHub issue `[p1] allow origin https://tint-and-tell.pages.dev`, plus voice | when I deploy |
| `pnpm playtest fill` working | P1 | `#web-server` | before 1:15 |
| Cloudflare Pages access (account member or a scoped API token) | P1 (account owner) | voice; token goes into `wrangler` env, **never git** | before 1:45 |
| Any protocol change | P1 | issue labeled `protocol`. **I never edit `packages/protocol`** | as needed |

| Others need | From me | Where |
|---|---|---|
| Join URL format `/join/CODE` + deep link `tintandtell://join/CODE` | P3 (QR/scanner) | already in `docs/PROTOCOL.md`; don't change it |
| A web host for the cross-play gate | P3, P4 | the prod/LAN URL in `#web-server` |
| Bug reports on the server (wrong view, leaked secret) | P1 | issue with the WS frame JSON copied from DevTools |

**Rules of engagement for my agents**:
- Read `#protocol` announcements (pasted in by Paweł) before rebasing.
- After any protocol PR merges: `git pull --rebase && pnpm install && pnpm fixtures:check`, then update screens that use the new fields.
- Never "fix" another owner's code in my PR. Write the request instead.
- A PR description lists what other owners must know (e.g. "needs P1 CORS origin X").

---

## 5. Definition of done (web)
- [ ] Every fixture renders correctly in `/dev`, in both postures and both themes.
- [ ] Online: create → QR → iOS joins → full 6-round game with Grok, with no console errors.
- [ ] Local: one browser, fold toggling (`F`) drives the secret ↔ table choreography, and the secret is never visible while "open".
- [ ] Reconnect: kill the network for 5 s mid-turn and the game resumes on the same seat.
- [ ] Guesser tab WS frames contain no `secret` before REVEAL (checked in DevTools).
- [ ] Reduced motion and dark mode both pass.
- [ ] Deployed to Pages, with the URL in the README.

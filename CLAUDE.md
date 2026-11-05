# Tint & Tell: agent rules (read first)

Tint & Tell is a color-association party game. Humans and **Grok** (an xAI bot) try to hit the same shade on a 24 × 12 board using only word clues. It is designed for a foldable phone: **closed = private secret, open = shared table**.
- Clients: native iOS (SwiftUI) and web (React).
- Server: one authoritative game server (Cloudflare Workers + Durable Objects).
- Multiplayer: local pass-and-play, plus online rooms with iOS ↔ web cross-play.

Full plan: `docs/PLAN.md`. Rules: `docs/RULES.md`. Contract: `docs/PROTOCOL.md`. Design: `design/Tint-and-Tell.pdf`.
**Your task list is your brief, `docs/agents/P<N>-*.md`. Do only what it says.**

## Layout & ownership
| Path | Owner | What |
|---|---|---|
| `packages/protocol` | P1 (+1 client approval) | zod schemas, constants: **the contract** |
| `packages/game-core` | P1 | palette, rules engine, scoring, clue validator |
| `packages/playtester` | P1 | headless fake-human client + CLI |
| `apps/server` | P1 | Worker + Room Durable Object + Grok bot |
| `apps/playtester-worker` | P1 | cron live test → Discord |
| `shared/` | P1 | `palette.json`, `fixtures/` (generated, never hand-edited) |
| `apps/web` | P2 | web client |
| `apps/ios` (except `TintAndTell/Table`) | P3 | Xcode project (XcodeGen), TintKit, app shell, closed screens |
| `apps/ios/TintAndTell/Table` | P4 | board, stones, table, reveal, unfold animation |
| `docs/`, `CLAUDE.md`, `.github/` | anyone, via PR, announce in voice | |

**Never edit outside your brief's "Owns" paths.** If you need a change elsewhere, stop and tell your human the exact request (file, change, why). They will pass it to the owner.

## Invariants (non-negotiable)
1. **Never put `secret` in a shared payload.** The server builds a `PlayerView` per connection (`you` = that socket's seats). Only the cue giver's connection gets `secret` before REVEAL.
2. Clients never compute rules or scores. They render `view` and send intents. Optimistic UI is fine, but the server's next `view` wins.
3. Clients drop any `view` with `seq ≤ lastSeq`.
4. The protocol is **additive-only** after `m0-foundation`. Any change updates zod + `gen-fixtures.ts` + the regenerated fixtures + the Swift mirror in one PR.
5. No secrets in git. `XAI_API_KEY` etc. go via `wrangler secret put`. Local values live in `.dev.vars` / `.env.local` (gitignored). Clients hold no API keys.
6. UI text is Polish (as in the design). Code, comments and commits are English.
7. Never show coordinates to players. Never show color names in hints.

## Git workflow (every agent)
1. One branch = one PR = one slice from your brief, named `p<N>/<slug>`, in brief order.
2. Start fresh: `git switch main && git pull --rebase && git switch -c p<N>/<slug>`.
3. **Commit every small working step** (every 5–15 min of work). Each commit must build. Use Conventional Commits with an area scope, imperative mood, subject ≤ 72 chars:
   `feat(server|web|ios-shell|ios-table|game-core|protocol|playtester): …`, `fix(…)`, `test(…)`, `chore(…)`, `docs: …`, `ci: …`.
   End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
4. Push early: `git push -u origin HEAD && gh pr create --draft --fill`. The PR body says `Closes #<issue>`.
5. When done and green locally: `git fetch && git rebase origin/main && git push --force-with-lease`, then `gh pr ready && gh pr merge --rebase --auto`.
   **Never squash. Never force-push `main`. Never rewrite others' commits.**
6. After the merge, start the next branch from fresh `main` immediately.
7. `pnpm-lock.yaml` conflict: `git checkout --theirs pnpm-lock.yaml && pnpm install && git add pnpm-lock.yaml`. Avoid adding deps; most are pre-installed.
8. Before every push run `pnpm -r typecheck && pnpm -r test && pnpm fixtures:check` (TS) or `swift test` in `apps/ios/TintKit` (iOS).

## Commands
```bash
pnpm install                      # once (pnpm 12 via corepack; Node ≥ 22)
pnpm -r typecheck && pnpm -r test # all TS packages
pnpm fixtures:check               # validate shared/fixtures against zod
pnpm palette                      # regenerate shared/palette.json (P1 only)
pnpm --filter @tint/protocol fixtures:gen   # regenerate fixtures (P1 only)
pnpm --filter @tint/server dev    # wrangler dev on :8787 (once P1 adds it)
pnpm --filter @tint/web dev       # vite on :5173 (once P2 adds it)
pnpm playtest <smoke|fill|attack> # playtest bot (once P1 adds it)
# iOS project is apps/ios/TintAndTell.xcodeproj (project.xcproj, Xcode 27.2 JSON)
```

## Conventions
- TS: strict, ESM, import workspace packages as `@tint/protocol` / `@tint/game-core` (TS source, no build step). Biome formats on commit (lefthook).
- Web: React 19 + React Router + Zustand + Motion, CSS Modules + CSS variables (`tokens.css`).
- Server: Workers + Durable Objects (SQLite-backed, WebSocket Hibernation API, alarms), zod-validate every input.
- iOS: Swift 6 strict concurrency, SwiftUI, Observation (`@Observable`), async/await, no third-party runtime deps, swift-testing. Polish copy is `apps/ios/TintAndTell/Localizable.xcstrings`; app screens use the generated symbols (`Text(.setupTitle)`). Views outside the app target take `LocalizedKey`. See `docs/ios/LOCALIZATION.md`.
- Brand tokens: Cold Steel `#F8F7F4` (light bg), Cocoa Spice `#191815` (dark bg), round gold `#E9B005`.

## Communication
- Voice channel always on. Discord channels: `#protocol` (contract changes), `#ios`, `#web-server`, `#playtest-bot` (automated reports), `#demo`.
- Syncs at T+1:15 (`m1-web-round`), T+1:45 (`m2-crossplay`), T+2:30 (`m3-freeze`).
- Blocked for more than 10 min? Tell your human and work on the next independent branch from your brief.

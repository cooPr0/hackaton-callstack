<div align="center">

# Tint & Tell

**Ludzie i Grok próbują trafić ten sam odcień samym językiem skojarzeń.**
*Humans and an AI try to land on the same shade, using nothing but words.*

Party game · iOS (SwiftUI) + Web (React) · real-time cross-play · Grok as a player · built for foldables

<video src="docs/demo.mp4" controls width="720" playsinline></video>

[Watch a round](docs/demo.mp4)

</div>



https://github.com/user-attachments/assets/00531298-f5cc-4fd0-bdcb-350bfcd9fba0



https://github.com/user-attachments/assets/c3ecc70f-1c36-40c4-8bcb-42f183909e7b



---

## The game in 30 seconds
1. **Closed phone = a secret.** The cue giver sees a small window of the color board with one shade marked, without coordinates. They type **one word**: *"Rosół."*
2. **Unfold = the table.** The board splits open from the hinge, and the clue appears on both edges so everyone around the table can read it. **Grok places its stone first**, with a short line: *"Złoty, ale nie z puszki. Biorę kratkę głębiej."*
3. **Fold again, a second look.** The cue giver sees where the stones landed and adds 1–2 words: *"…z marchewką."*
4. **Reveal.** Everything outside 5 × 5 fades and rings are drawn around the target. Points: 3 for the target, 2 for the 3 × 3 around it, 1 for the 5 × 5. The cue giver scores for every stone inside the 3 × 3.

Three modes:
- **Stół**: everyone takes turns as cue giver, and Grok always guesses.
- **Ty podpowiadasz**: you give the clues, and Grok alone guesses.
- **Grok podpowiada**: Grok gives the clues, and you guess.

## Watch

Dark mode, English voice, a real room on the live server. Grok is the guesser.

| | |
|---|---|
| **Web, one round** (30s) | [tint-and-tell-web-dark-30s.mp4](pitch/out/tint-and-tell-web-dark-30s.mp4) |
| **Phone, the full round** (29s) | [tint-and-tell-mobile-30s.mp4](pitch/out/tint-and-tell-mobile-30s.mp4) |
| **Web, the long walkthrough** (90s) | [tint-and-tell-how-it-works.mp4](pitch/out/tint-and-tell-how-it-works.mp4) |

The 30-second web film is one round on the wide dark layout: the palette, the room code, the private shade, *honey*, *warm kitchen*, the shade opening, and a tie. On the phone the same round runs straight through on the closed screen, then the open table. The 90-second film is the longer pass: the three modes, then the round on the open table with a single upright clue bar.

## Why a foldable
On a foldable phone, **the hinge is the privacy boundary**. Folded, the phone hides the secret. Unfolded, it becomes a shared table. The design follows from that:
- The board is 24 × 12 so the fold falls in the gap between columns 12 and 13, and no swatch is cut.
- Nothing ever zooms toward the target, because a zoom would give it away.
- Text appears twice, the second copy rotated 180°, for people sitting across the table.

No device is required, though. Any phone, tablet or browser can join an online room, and a web room can host iPhones.

## What's inside
- **One authoritative game server** on Cloudflare Workers + Durable Objects (one object per room, WebSockets with hibernation).
- **Per-player views.** Each connection receives its own `PlayerView`. The secret shade is never broadcast: only the cue giver's socket gets it before the reveal. CI tests this, and so does the playtest bot.
- **Grok (xAI) as a real player.** It reads the board as OKLCH data, guesses, gives clues, and defends its misses. Its output is schema-validated, color words are blocked, and a deterministic fallback takes over if the API is slow, so the game never stalls.
- **Cross-play.** iOS and web speak one JSON protocol (zod in TS, mirrored as Swift `Codable`). Both platforms' tests decode the same golden fixtures.
- **A perceptual palette**: 288 OKLCH swatches, gamut-mapped to sRGB, tuned so that no swatch "melts" into the light or dark background (ΔE_OK ≥ 0.11).
- **A playtest bot**: headless fake players that join your room, plus a cron job that plays a full game against production every 10 minutes and reports to Discord.

```
 iOS app ──┐   HTTPS /api/...          ┌──────────── Cloudflare ────────────────────┐
 Web app ──┼─► WSS /api/rooms/:code/ws ─► Worker ─► Room Durable Object (per room)  │─► xAI Grok
 Playtester┘                           │  Cron worker: live smoke game every 10 min ─│─► Discord
                                       └────────────────────────────────────────────┘
```

## Repository
| Path | What |
|---|---|
| `packages/protocol` | zod schemas + constants: **the contract** |
| `packages/game-core` | palette generator, rules engine, scoring, clue validator |
| `packages/playtester` | headless fake-player client + CLI |
| `apps/server` | Worker, Room Durable Object, Grok bot |
| `apps/playtester-worker` | scheduled live test |
| `apps/web` | web client (Vite, React 19, Zustand, Motion) |
| `apps/ios` | iOS app (SwiftUI, XcodeGen) + `TintKit` package |
| `shared/` | `palette.json` and golden `fixtures/` used by every platform |
| `docs/` | [plan](docs/PLAN.md), [rules](docs/RULES.md), [protocol](docs/PROTOCOL.md), [web plan](docs/web/PLAN.md), [agent briefs](docs/agents/), [demo](docs/DEMO.md), [pitch](docs/PITCH.md) |

## Quick start
Requirements: Node ≥ 22 and `corepack enable` (pnpm 12). For iOS you also need Xcode 26 and `brew install xcodegen`.
```bash
pnpm install
pnpm -r typecheck && pnpm -r test && pnpm fixtures:check

pnpm --filter @tint/server dev        # game server on :8787   (needs apps/server/.dev.vars, see .dev.vars.example)
pnpm --filter @tint/web dev           # web client on :5173    (apps/web/.env.local: VITE_API_URL=http://localhost:8787)
pnpm playtest fill <CODE> --count 2   # add two fake players to your room
pnpm playtest smoke --env local       # play a full game headless and check invariants

cd apps/ios && xcodegen && open TintAndTell.xcodeproj   # scheme "Local"
```
Secrets (`XAI_API_KEY`, the Discord webhook) live only in `wrangler secret` and gitignored `.dev.vars`. Never commit them.

## How we built it
Four people, each running their own Claude Code agent, worked in parallel for 3 hours.
1. **Contract first.** A foundation commit set fixed the protocol, rules, palette and golden fixtures before anyone wrote app code.
2. **Strict ownership.** Each agent had a brief ([docs/agents](docs/agents/)) listing the directories it owns, the exact branch sequence, and a done check for every branch.
3. **Small commits, rebase-merged.** Every step is a commit, and PRs are rebase-merged, never squashed. `git log --graph` on `main` therefore shows the whole build. Tags mark the milestones: `m0-foundation` → `m1-web-round` → `m2-crossplay` → `m3-freeze` → `demo`.
4. **Shared fixtures as referee.** The TS and Swift test suites decode the same JSON, so protocol drift fails CI instead of failing the demo.

## Impact
Tint & Tell is a party game first. It also touches a few bigger questions:
- **Screens that bring people together.** One device becomes a shared table for a group, instead of everyone looking at their own phone. Foldables are a new form factor that has few multiplayer experiences designed for it.
- **Do machines see color the way we talk about it?** Every round is a small perception experiment: a word, a target, human guesses and an AI guess. With players' opt-in consent and anonymization, those rounds could form an open dataset of color–word associations. That could be used to measure how well language models are grounded in human perception, starting with Polish, a language that is under-represented in perception research.
- **Language as play.** Describing a shade without naming the color pushes players toward metaphor: food, places, memories. That's useful for language learners and for kids building vocabulary.
- **Privacy by design, as a pattern.** The hinge as a physical privacy boundary, together with per-seat server projections, is a reusable pattern for any multi-user app on foldables: card games, negotiations, classroom quizzes.
- **Next: inclusion.** About 1 in 12 men of Northern European descent has a color-vision deficiency. On the roadmap: a CVD-aware mode with palettes validated against deuteranopia and protanopia simulations, plus pattern overlays, so a game about color doesn't exclude the people who see it differently.

## Roadmap
- [ ] CVD-aware palettes + pattern overlays
- [ ] Opt-in anonymous round dataset + a public "human vs model" color-alignment leaderboard
- [ ] More languages for the UI and the bot persona (EN, DE, UA)
- [ ] Native foldable posture APIs as they ship, plus Android foldables via the web Viewport Segments API
- [ ] Spectator mode for streams

## Status
This is a hackathon prototype under active development. Device dimensions for the foldable are assumed (≈402 × 874 pt closed, ≈1036 × 828 pt open). The cue-giver scoring rule is our interpretation of the design and may change.

## Credits
- Game & visual design: see `design/Tint-and-Tell.pdf`. The logo "Dwa T" was drawn from scratch on its own geometry, with no licensed typefaces.
- Bot: [xAI Grok](https://x.ai/api).
- Infra: Cloudflare Workers & Durable Objects.

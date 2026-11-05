<div align="center">

# Tint & Tell

**Ludzie i Grok próbują trafić ten sam odcień samym językiem skojarzeń.**

One phone is the table. Grok plays by the same rules as everyone else.

</div>

## Impact

At a party the phone usually pulls people into their own screens. Here it does the shared work. Folded, it hides one shade. Unfolded, the whole table reads the same clue and places stones on one board. The hinge is the privacy boundary, so a game with a secret works on a single device. A browser can fake that fold, and an iPhone can join the same room as the web.

Grok sits in a seat. It guesses and gives clues with the same limits as a person: no color names, no coordinates, the same points. The reveal puts a human stone and a model stone on the same palette. The table sees, in that round, whether a model and the people around it meant the same thing by a word. Those words are the ones players actually reach for, Polish first.

The secret holds in the room and on the wire. Only the cue giver's connection receives the target before the reveal. A playtest bot checks that on every message.

## A round

1. **Closed.** The cue giver sees a window of the 24 × 12 board and types one word. *"Rosół."*
2. **Open.** The board splits from the hinge. Grok places first, then everyone else.
3. **Closed again.** The cue giver sees the stones and adds one or two words. *"z marchewką."*
4. **Reveal.** 3 on the shade, 2 in the 3 × 3, 1 in the 5 × 5. The cue giver scores for every stone in the 3 × 3.

**Stół** rotates the clue. **Ty podpowiadasz**: you clue, Grok guesses. **Grok podpowiada**: the reverse.

## Run

Node 22 or newer, then `corepack enable`. For iOS, open `apps/ios/TintAndTell.xcodeproj`.

```bash
pnpm install
pnpm -r typecheck && pnpm -r test && pnpm fixtures:check
pnpm --filter @tint/server dev      # :8787
pnpm --filter @tint/web dev         # :5173
```

Keys stay in `wrangler secret` and in gitignored `.dev.vars`.

## Repo

`packages/protocol` is the contract. `packages/game-core` is the rules. `apps/server` runs the room and Grok. `apps/web` and `apps/ios` render a view and send intents. `shared/fixtures` is what both test suites decode. Rules, protocol, and the pitch are in [`docs/`](docs/).

Four people and four agents built this in three hours from that contract. Pull requests are rebase-merged, so `git log` on `main` is the build.

This is a hackathon prototype. The cue-giver score is our reading of the design and can change.

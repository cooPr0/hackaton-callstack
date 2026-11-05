# Sound: shared contract (iOS designs it, both apps play it)

**Owner of the sounds:** the iOS team (P3/P4) designs and exports them.
**Web (P2):** plays the same files on the same events.
**Contract:** the event names below and `shared/sounds/manifest.json`. One set of files serves both platforms, so iOS and web sound identical in cross-play.

## Events
These names are the contract. Don't rename them; add new ones freely.

| Event id | When it fires | Who hears it | Feel (suggestion) | Haptic pairing (iOS) |
|---|---|---|---|---|
| `ui.tap` | primary button press | the device | soft, dry click | `.selection` |
| `seal` | viewfinder closes into the seal (unfold step, 180 ms) | table | low, muffled "thock", like a lid closing | `.impact(.heavy)` |
| `unfold` | board halves slide out from the hinge (220–520 ms) | table | airy paper/fabric whoosh outward, stereo spread L/R | none |
| `fold` | the device is folded during play (local) | device | short reverse whoosh | none |
| `clue.write` | clue writes onto the table edges (560–760 ms) | table | quick pencil/marker scribble, ~200 ms | `.selection` |
| `turn.yours` | it becomes this device's turn to place | device | gentle two-note rise | `.impact(.light)` |
| `grok.thinking` | Grok starts "thinking" (≥1.2 s) | table | tiny ticking or a soft hum; **must loop cleanly or be ≤1.2 s** | none |
| `stone.grok` | Grok's stone lands | table | glossy, heavier stone on wood | `.impact(.medium)` |
| `stone.place` | a human stone lands | table | lighter stone on wood | `.impact(.light)` |
| `stone.reject` | placement refused (cell taken / not your turn) | device | muted bump | `.notification(.warning)` |
| `reveal` | everything outside 5 × 5 fades and the rings draw | table | a breath in: soft swell, ~600 ms | none |
| `score.exact` | a +3 badge pops | table | bright chime (highest) | `.notification(.success)` |
| `score.near` | a +2 badge pops | table | mid chime | `.impact(.light)` |
| `score.far` | a +1 badge pops | table | low chime | none |
| `round.end` | the round card appears / hand-off | device | short resolved cadence | none |
| `game.win` | game-over screen | device | 2–3 s celebratory phrase, the "Tint & Tell" sound logo | `.notification(.success)` |
| `error` | any error toast | device | soft low "nope" | `.notification(.error)` |

Rules of thumb:
- Everything is **short (≤ 800 ms)** except `game.win` and the `grok.thinking` loop.
- The score chimes should form a scale (+1 < +2 < +3), because they play staggered during the reveal.
- Sounds are warm, tactile and analog-ish: stones, paper, wood. That matches the off-white and warm-black palette. Avoid arcade bleeps.

## Files & format
- Put the files in `shared/sounds/<event-id>.m4a`. AAC in an MP4 container plays natively on iOS, Safari, Chrome and Firefox.
- Mono 44.1 kHz, about 128 kbps, loudness-normalized to about **-16 LUFS** with peaks at or below -1 dBTP, and no leading silence. Keep each file under 100 KB.
- **Only original or properly licensed audio.** Note the source and license of every file in `shared/sounds/CREDITS.md`.
- `shared/sounds/manifest.json` maps each event to its file and a gain (0–1). A missing event just plays nothing, so both apps ship before every sound exists.

## Behavior (both apps)
- A **mute toggle** in the pause sheet. Persist it per device. Default: on.
- Respect the system: iOS uses the `.ambient` audio session, so sounds obey the silent switch and mix with the user's music. Web plays nothing until the first user gesture (autoplay policy).
- Sounds fire only for **local UI events derived from `view` changes**, never from the server. In cross-play every device decides for itself, e.g. `turn.yours` plays only on the device whose turn it is.
- Reduced Motion doesn't mute sound, but the `unfold`/`clue.write` timing follows the shortened 200 ms crossfade.

## Web implementation (P2, branch `p2/sound` after `p2/wire-game`)
- `apps/web/src/sound/`:
  - `manifest.ts` loads `@shared/sounds/manifest.json` and the files via `import.meta.glob`.
  - `player.ts` decodes the files on the first gesture through Web Audio (`AudioContext`) and does `play(event)` with the manifest gain. A missing file is a no-op.
  - `useSoundEvents(view)` diffs the previous and next view and emits events: a new stone, `turnSeatId` changing to me, a phase going to REVEAL, `bot.status thinking`.
  - The mute state lives in localStorage, wrapped in try/catch.
- The table animations call `play('seal' | 'unfold' | 'clue.write')` at their timeline marks.

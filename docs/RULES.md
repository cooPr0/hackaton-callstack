# Tint & Tell: Rules

The source of truth for `packages/game-core`. Constants live in `packages/protocol/src/constants.ts`.

## Board
- 24 columns × 12 rows = 288 cells, from `shared/palette.json` (OKLCH, with hue across the columns and lightness down the rows, top row L 0.88).
- Coordinates: `x` 0–23 (left → right), `y` 0–11 (top → bottom). **Never shown to players.**
- The hinge sits in the grout between x = 11 and x = 12, so no cell is cut by the fold.

## Seats & modes
| Mode | Cue giver | Guessers |
|---|---|---|
| `stol` (Stół) | humans take turns (seat order) | all other humans + Grok |
| `ty` (Ty podpowiadasz) | humans take turns | Grok only |
| `grok` (Grok podpowiada) | Grok every round | all humans |

- 2–6 seats. Exactly one `grok` seat.
- Default 6 rounds (1–12).

## Round
```
LOBBY → SECRET_1 → GUESS_1 → SECRET_2 → GUESS_2 → REVEAL → (next round: SECRET_1 | GAME_OVER)
```
1. **SECRET_1**: the server picks a random target. The cue giver sees a **7 × 9 viewfinder** around it, clamped to the board edges (`x0 = clamp(tx-3, 0, 17)`, `y0 = clamp(ty-4, 0, 3)`), with the target marked by corner brackets. They submit **exactly 1 word**.
2. **GUESS_1**: **Grok places first**, after at least 1.2 s of "thinking". Then each human guesser places one stone, in seat order. A cell holds at most one stone.
3. **SECRET_2**: the cue giver sees the viewfinder again, now with copies of the stones in it, and adds **1–2 words**.
4. **GUESS_2**: same as GUESS_1. Grok goes first, then one more stone per guesser.
5. **REVEAL**: the target is revealed to everyone, and awards are computed. Grok may say one line defending its guess.
6. `round.next` starts the next round with the next cue giver. After `totalRounds` the game goes to GAME_OVER.

## Scoring
- Per stone, by Chebyshev distance `d = max(|dx|, |dy|)` from the target:

  | d | points | reason |
  |---|---|---|
  | 0 | 3 | `exact` |
  | 1 (inside 3 × 3) | 2 | `near` |
  | 2 (inside 5 × 5) | 1 | `far` |
  | ≥ 3 | 0 | (no award entry) |

- **Cue giver**: +1 for every stone inside 3 × 3 (`house`). ⚠️ This rule is our reading of the mock-up ("4 kamienie w domu") and is easy to change in one function.

## Clues
- Letters (any script, including Polish diacritics) and single spaces only. Max 24 chars.
- SECRET_1: exactly 1 word. SECRET_2: 1–2 words.
- **No color names** (PL + EN blocklist in game-core, matched case-insensitively and diacritic-insensitively on word stems, e.g. `zielon*`, `czerwon*`, `blue`, `teal`). The error code is `COLOR_WORD`.
- Grok's clues go through the same validator.

## Timing
- Online: 60 s per stone (`turnDeadline`). On timeout the stone is skipped.
- Local: no timer.
- Pause freezes timers.

## Privacy
- **Online**: only the cue giver's connection receives `secret` before REVEAL.
- **Local** (one device holds every human seat): the device receives `secret`, and the client must render it **only in closed posture**.

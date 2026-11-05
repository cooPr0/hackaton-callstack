# Brief P4: iOS table, board, reveal, unfold animation

**Role**: everything shown when the phone is **open on the table**: the 24 × 12 board, stones, long-press placement with a loupe, double-sided edge bars, the reveal, and the signature unfold animation.

**Owns**: `apps/ios/TintAndTell/Table/**` only.
**Exposes** (the seam with P3): `struct TableView: View { init(view: PlayerView, onPlace: @escaping (Int, Int) -> Void) }`.
**Reads**: `CLAUDE.md`, `docs/RULES.md`, `design/Tint-and-Tell.pdf` (p.4 table screens and the unfold timeline), `shared/palette.json`, `shared/fixtures/views/{guess1,guess2,reveal,local-guess1}.json`, and TintKit (`Palette`, `Theme`, `PlayerView`, from P3).

**Until P3's `p3/project` + `p3/tintkit-models` merge (~T+0:25–0:40)**: work in a throwaway local Swift package or Xcode playground (do NOT commit it). Load `palette.json` and decode the fixtures with a minimal local copy of the models. Then move the code into `TintAndTell/Table/` and switch to TintKit's types. Sources are folder-globbed by XcodeGen, so you never edit `project.yml`.

## Branches (in order; one PR each; commit every small step)

### 1. `p4/board`
- `BoardView`: a SwiftUI `Canvas` drawing 288 rounded cells from `Palette`, with a grout gap between cells and a **wider gap between x 11 and 12** (the hinge).
- `BoardGeometry`: cell rects for a given size, and a hit-test `point → (x, y)?`.
- Previews from `guess1.json`.
- Done when: the board looks like PDF p.4 "Pierwszy kamień".

### 2. `p4/stones-placement`
- `StoneLayer`: a white disc with an initial for each human, a black dot for Grok, n = 1 / 2 styling, and a drop-in animation.
- `PlacementGesture`: long-press (0.25 s) → `LoupeOverlay` (a magnified 3 × 3 around the finger with the selected cell outlined) → drag to adjust → release calls `onPlace(x, y)`. Only enabled when `view.you ∋ view.turnSeatId`. Occupied cells are disabled.
- Fallback: tap to select + confirm button.
- `.sensoryFeedback(.selection)` when the selected cell changes.

### 3. `p4/edge-bars`
- `EdgeBar` at the bottom: "Podpowiedź Kuby · pierwszy kamień", the clue in huge display type, Grok's line ("Grok: „…”"), and the scores (Ola / Grok / Kuba).
- The same bar at the top, **rotated 180°**, for the player across the table.
- A pause button centered on the hinge, top and bottom. "Twój ruch, Ola" turn indicator.

### 4. `p4/reveal-overlay`
- Cells outside the 5 × 5 around the target fade: light mode towards Cold Steel, dark mode towards Cocoa Spice.
- Rings at 3 × 3 (solid) and 5 × 5 (dashed).
- "+3 / +2 / +1" badges next to the stones, from `view.reveal.awards`.
- Staggered appearance. The edge bars show "Odcień Kuby" + clues + the final scores + `botLine`.
- Done when: it matches PDF p.4 "Odsłonięcie" in light and dark.

### 5. `p4/unfold`
`UnfoldTransition`, played when the posture goes closed → open in GUESS phases (the PDF timeline):
- 0 ms: the viewfinder corners move to the center.
- 180 ms: the sample closes into a black square ("seal") with `.sensoryFeedback(.impact(weight: .heavy))`.
- 220–520 ms: the board halves slide out from the hinge to the sides (spring 0.5 s). **Nothing zooms towards the target**, which would leak it.
- 560–760 ms: the clue writes on both edges, with `.sensoryFeedback(.selection)`.
- Reduce Motion: the board and clue crossfade in 200 ms, and the haptics stay.

### 6. `p4/portrait-table`
- A portrait variant for online guessers on a closed phone: the board rotated 90° to fit, pinch-zoom + pan, the same placement gesture, and a single edge bar.

## Notes
- Never render `view.secret` in the table during GUESS phases. In local mode the device has it, but the table is public.
- Use `Theme` colors only. No hard-coded hex outside TintKit.
- Test the open posture on the iPad simulator (≈1036×828 window) and the closed one on an iPhone simulator.

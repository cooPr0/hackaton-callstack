# Brief P3: iOS app shell, networking, closed screens

**Role**: the iOS app's skeleton. That covers the XcodeGen project, `TintKit` (protocol models, networking, palette, theme), the store and router, and every **closed / private** screen. P4 builds the table inside your app, so **ship branch 1 by T+0:25**.

**Owns**:
- `apps/ios/project.yml`
- `apps/ios/Config/**`
- `apps/ios/TintKit/**`
- `apps/ios/TintDesign/**`
- `apps/ios/TintCore/**`
- `apps/ios/TintAndTell/{App,Store,Screens,Posture,Resources}/**`

**Not yours**: `apps/ios/TintAndTell/Table/**` (P4).
**Reads**: `CLAUDE.md`, `docs/PROTOCOL.md`, `packages/protocol/src/*.ts` (mirror these exactly), `shared/fixtures/**`, `shared/palette.json`, `design/Tint-and-Tell.pdf`.
**Stack**: Xcode 27.2, iOS 27.1 deployment target, Swift 6, SwiftUI, Observation, swift-testing. **The project is `apps/ios/TintAndTell.xcodeproj` with a JSON `project.xcproj`. Do not add XcodeGen or a second project file.**

## Branches (in order; one PR each; commit every small step)

### 1. `p3/project` ⏰ **by T+0:25**
Already on disk: `apps/ios/TintAndTell.xcodeproj` (`project.xcproj`), app sources in `apps/ios/TintAndTell`, bundle id `com.tintandtell.app`, deployment target iOS 27.1, iPhone and iPad, synchronized folders. Do not regenerate it.
- Add `TintCore` as a local Swift package when the engine starts. Keep new screens inside `TintAndTell/` so the synchronized folder picks them up. P4's `Table/` folder belongs there.
- Done when: `xcodebuild -project apps/ios/TintAndTell.xcodeproj -scheme TintAndTell -destination 'generic/platform=iOS Simulator' build` passes.

### 2. `p3/tintkit-models`
- `Config.swift`: base URL from Info.plist, plus a DEBUG override stored in UserDefaults.
- `Protocol/Constants.swift`: board 24×12, hinge after x 11, viewfinder 7×9, `PROTOCOL_VERSION`.
- `Protocol/Common.swift`: `Cell`, `Stone`, enums `Mode`, `Phase`, `SeatKind`, `Platform`, `ErrorCode` (raw values exactly as in TS).
- `Protocol/PlayerView.swift`: `SeatView`, `Secret`, `ViewfinderWindow`, `Reveal`, `Award`, `HistoryEntry`, `PlayerView`.
- `Protocol/ClientMessage.swift`: an enum with associated values, `Encodable` with a `type` discriminator, and an auto `cid`.
- `Protocol/ServerMessage.swift`: an enum, `Decodable` via `type`.
- `Protocol/HTTP.swift`: create/join/health DTOs.
- `Palette.swift`: decodes `palette.json` → `[PaletteCell]` with a `Color` per cell. Loads from a `Bundle` or `Data`.
- `Theme.swift`: Cold Steel `#F8F7F4`, Cocoa Spice `#191815`, gold `#E9B005`, adaptive light/dark.
- Tests (swift-testing): decode **every** file in `shared/fixtures/messages` and `views`, located via `#filePath` → repo root `shared/fixtures`, so no resource copying is needed. Also encode `ClientMessage`s and compare them to the fixtures, and assert the palette has 288 cells.
- Done when: `swift test` is green. Announce in `#ios` so P4 can use the models.

### 3. `p3/tintkit-net`
- `APIClient`: async `createRoom`, `join`, `health`. Errors map to `ErrorCode`.
- `RoomClient` (actor):
  - `URLSessionWebSocketTask`, receive loop → `AsyncStream<ServerMessage>`.
  - `send(_:) async throws` awaiting `ack`/`error` by `cid`, with a 5 s timeout.
  - `ping` every 20 s; backoff reconnect 0.5 → 8 s that re-sends `hello`.
  - Drops `view` with `seq ≤ lastSeq`.
- `TokenStore`: Keychain, keyed by room code.
- Done when: it connects to local `wrangler dev` (simulator: `localhost:8787`) and receives a `view`.

### 4. `p3/store-router`
- `GameStore` (`@Observable @MainActor`): `view`, `posture`, `pending`, `error`, `botStatus`, `botLine`, plus the intents `createRoom / join / start / submitClue / place / next / pause / end`.
- `Posture/PostureReader.swift`: from the root `GeometryReader`, `open = w > h && w >= 700`. The hinge x is `w/2`. A DEBUG 3-finger tap toggles a forced posture.
- `RootView`: `switch (phase, posture, role, local)` → screen. The table seam is `TableView(view: PlayerView, onPlace: (Int, Int) -> Void)`, owned by P4. Use a placeholder until P4's `TableView` exists, with the **same signature**.
- A hidden server switcher (long-press the logo): Local / Prod / custom.
- Previews for every phase from the fixtures.

### 5. `p3/setup-join`
- `SetupView` (as on PDF p.3: "Nowa partia", 3 mode tiles with stones, player chips + "Dodaj", "6 rund · ok. 20 min", "Losuj odcień dla Kuby").
- `JoinView` (code entry) + `onOpenURL` for `tintandtell://join/CODE`.
- `LobbyView`.
- Done when: iOS joins a room created on web.

### 6. `p3/closed-screens` ⏰ **T+1:45 gate: iOS cue giver in a web-hosted room**
- `ViewfinderView`: 7×9 cells from `secret.window`, corner brackets on the target, stone copies in SECRET_2, no coordinates. Header "Runda 3 z 6 · patrzy tylko Kuba".
- `ClueEntryView`: huge display type with a caret. "Pierwsza podpowiedź, jedno słowo" / "Druga podpowiedź, do dwóch słów". "Bez nazw kolorów i bez pozycji na planszy." Inline errors.
- `RoundCardView`: a big target swatch with "Odcień Kuby · N kamienie w domu" and the clues, then "Podaj Oli" + scores.
- `GrokSecretView`: a black card back with a seal, "Grok zna odcień", and Grok's line.
- `HandOffView`: "‹name›, złóż telefon" / "Rozłóż telefon na stole".
- `PauseSheet`: system sheet with a `.glassEffect` button (Liquid Glass). Actions: resume, rules, pass role, end game.

### 7. `p3/polish`
- Dark mode (Cocoa Spice).
- App icon light/dark (Icon Composer layers: background, gold T, dark T).
- `.sensoryFeedback` on clue submit.
- Local pass-and-play end-to-end on the iPad simulator (resize the window to fold and unfold).

## Notes
- Swift models must match the TS zod schemas field-for-field. Optional TS fields → Swift optionals; `nullable` → optional.
- If the protocol changes (P1 announces it in `#protocol`), update the mirror in the same PR or the next one, and re-run `swift test`.

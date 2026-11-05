# iOS localization

Polish is the source language, and English is the other supported language. Copy lives in `apps/ios/TintAndTell/Localizable.xcstrings`. The app target generates Swift symbols from that catalog (`STRING_CATALOG_GENERATE_SYMBOLS`), so a screen in `TintAndTell` — including `Table/` — writes:

```swift
Text(.setupTitle)
Text(.roundLooksOnly(round: view.round, total: view.rounds, cueGiver))
Text(.revealShadeLine(cueGiver, stones: stonesInHome))
Button(.pauseResume) { resume() }
```

The symbol is a `LocalizedStringResource`. `Text`, `Button`, `Label`, and navigation titles accept it. Add a new string to the catalog with `extractionState` `manual`, a `pl` value, and a comment that quotes the screen. Number and plural arguments are named (`round:`, `count:`, `stones:`). Text arguments stay positional: a named string substitution is not a plural variation, and the catalog compiler rejects it. Polish plurals need `one`, `few`, `many`, and `other`.

Player names, typed clues, room codes, and bot lines are data. Pass them as format arguments, or show them with `Text(verbatim:)`.

## Views outside the app target

`TintDesign` and any other Swift package do not get the generated symbols, and a string literal in `Text` / `Button` / `Label` would be extracted into the wrong bundle.

- Take copy as `LocalizedKey` (a typealias for `LocalizedStringResource` in TintDesign) and pass a generated symbol from the call site in the app.
- A literal that is not a catalog key goes through `String(verbatim:)` and is shown with `Text(verbatim:)`.

```swift
struct ModeTile: View {
    var title: LocalizedKey
    var detail: LocalizedKey

    var body: some View {
        Text(title)
        Text(detail)
    }
}

ModeTile(title: .setupModeTable, detail: .setupModeTableDetail)

Text(verbatim: playerName)
Text(verbatim: String(verbatim: " · "))
```

`TintDesignTests` fails when a `View` or `ViewModifier` in an iOS package contains any other string literal.

Score rows and the pause-sheet list are one formatted entry per seat (`.scorePlayer`, `.scoreDelta`). The comma and the middle dot between seats are layout punctuation, so they use `String(verbatim:)`, not a catalog key.

import Foundation

/// User-facing copy from the app target's string catalog.
///
/// Xcode generates static members on `LocalizedStringResource` from
/// `TintAndTell/Localizable.xcstrings`. A view that lives outside that target
/// takes those members as parameters:
/// `ModeTile(title: .setupModeTable, detail: .setupModeTableDetail)`.
public typealias LocalizedKey = LocalizedStringResource

extension String {
    /// A string that is not a catalog key.
    ///
    /// Use this for a player name, a clue, a room code, or layout punctuation.
    /// Show the result with `Text(verbatim:)`. A string literal passed to
    /// `Text`, `Button`, or `Label` is extracted as a localization key.
    public init(verbatim value: String) {
        self = value
    }
}

import Foundation

/// Clue shape shared by the local engine and the on-device Grok call.
public enum ClueText {
    /// Letters and single spaces, max 24 characters. One word in SECRET_1, one or two in SECRET_2.
    /// Color stems are rejected. Returns the trimmed text.
    public static func normalized(_ raw: String, phase: GamePhase) -> String? {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, text.count <= 24 else { return nil }
        guard text.unicodeScalars.allSatisfy({ CharacterSet.letters.contains($0) || $0 == " " }) else {
            return nil
        }
        let words = text.split(separator: " ").map(String.init)
        switch phase {
        case .secret1:
            guard words.count == 1 else { return nil }
        case .secret2:
            guard words.count == 1 || words.count == 2 else { return nil }
        default:
            return nil
        }
        guard words.allSatisfy({ !isColor($0) }) else { return nil }
        return text
    }

    private static let stems = [
        "zielon", "czerwon", "niebies", "fiolet", "brazow", "pomaranc", "rozow", "zolt",
        "czarn", "bial", "szar", "zlot", "srebr", "blue", "teal", "yellow", "green", "pink",
        "purple", "orange", "black", "white", "grey", "gray", "cyan", "gold",
    ]

    private static func isColor(_ word: String) -> Bool {
        let folded = word.folding(options: .diacriticInsensitive, locale: Locale(identifier: "pl_PL")).lowercased()
        if ["red", "blue", "gold", "pink", "grey", "gray", "teal", "cyan"].contains(folded) { return true }
        return stems.contains { folded.hasPrefix($0) }
    }
}

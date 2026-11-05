import Foundation
import Testing

struct LocalizationTests {
    @Test func catalogIsPolishAndKeepsDesignCopy() throws {
        let catalog = try JSONDecoder().decode(StringCatalog.self, from: Data(contentsOf: catalogURL))
        #expect(catalog.sourceLanguage == "pl")

        #expect(catalog.value(for: "app.tagline") == "Złożony telefon trzyma sekret, rozłożony staje się stołem.")
        #expect(catalog.value(for: "setup.title") == "Nowa partia")
        #expect(catalog.value(for: "setup.title", language: "en") == "New game")
        #expect(catalog.value(for: "secret.firstClue") == "Pierwsza podpowiedź, jedno słowo")
        #expect(catalog.value(for: "secret.secondClue") == "Druga podpowiedź, do dwóch słów")
        #expect(catalog.value(for: "secret.rules") == "Bez nazw kolorów i bez pozycji na planszy.")
        #expect(catalog.value(for: "secret.unfold") == "Rozłóż telefon na stole")
        #expect(catalog.value(for: "secret.bothInFrame") == "Oba kamienie w kadrze")
        #expect(catalog.value(for: "grok.knows") == "Grok zna odcień")
        #expect(catalog.value(for: "pause.title") == "Pauza")
        #expect(catalog.value(for: "pause.end") == "Zakończ partię")
        #expect(catalog.value(for: "setup.mode.table") == "Stół")
        #expect(catalog.value(for: "table.clueFirst") == "Podpowiedź %@ · pierwszy kamień")
        #expect(catalog.pluralValue(for: "setup.rounds", form: "many", substitution: "count") == "%arg rund")
        #expect(catalog.pluralValue(for: "reveal.shadeLine", form: "few", substitution: "stones") == "%arg kamienie w domu")
    }

    @Test func packageViewsHaveNoRawStrings() throws {
        let violations = try packageViewViolations()
        #expect(violations.isEmpty, "Package views take LocalizedKey. \(violations.joined(separator: "\n"))")
    }

    @Test func verbatimLiteralsAreAllowed() {
        let source = """
        struct Row: View {
            var body: some View {
                Text(verbatim: "Kuba")
                Text(verbatim: String(verbatim: " · "))
            }
        }
        """
        #expect(viewStringViolations(in: source).isEmpty)
    }

    @Test func rawLiteralsAreRejected() {
        let source = """
        struct Row: View {
            var title: LocalizedKey
            var body: some View {
                Text(title)
                Text("Nowa partia")
            }
        }
        """
        let violations = viewStringViolations(in: source)
        #expect(violations.count == 1)
        #expect(violations.first?.snippet.contains("Nowa partia") == true)
    }
}

private struct StringCatalog: Decodable {
    var sourceLanguage: String
    var strings: [String: Entry]

    struct Entry: Decodable {
        var localizations: [String: Localization]
    }

    struct Localization: Decodable {
        var stringUnit: Unit?
        var variations: Variations?
        var substitutions: [String: Substitution]?
    }

    struct Unit: Decodable {
        var value: String
    }

    struct Variations: Decodable {
        var plural: [String: Form]
    }

    struct Form: Decodable {
        var stringUnit: Unit
    }

    struct Substitution: Decodable {
        var variations: Variations?
    }

    func value(for key: String, language: String = "pl") -> String? {
        strings[key]?.localizations[language]?.stringUnit?.value
    }

    func pluralValue(for key: String, form: String, substitution: String? = nil) -> String? {
        let localization = strings[key]?.localizations["pl"]
        if let substitution {
            return localization?.substitutions?[substitution]?.variations?.plural[form]?.stringUnit.value
        }
        return localization?.variations?.plural[form]?.stringUnit.value
    }
}

private let catalogURL: URL = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .appending(path: "TintAndTell/Localizable.xcstrings")

private func packageViewViolations() throws -> [String] {
    let ios = catalogURL.deletingLastPathComponent().deletingLastPathComponent()
    let packages = try FileManager.default.contentsOfDirectory(at: ios, includingPropertiesForKeys: nil)
        .filter { FileManager.default.fileExists(atPath: $0.appending(path: "Package.swift").path) }
    var violations: [String] = []
    for package in packages {
        let sources = package.appending(path: "Sources")
        guard let enumerator = FileManager.default.enumerator(at: sources, includingPropertiesForKeys: nil) else { continue }
        for case let url as URL in enumerator where url.pathExtension == "swift" {
            let source = try String(contentsOf: url, encoding: .utf8)
            for violation in viewStringViolations(in: source) {
                violations.append("\(url.lastPathComponent):\(violation.line) \(violation.snippet)")
            }
        }
    }
    return violations
}

struct ViewStringViolation: Equatable {
    var line: Int
    var snippet: String
}

func viewStringViolations(in source: String) -> [ViewStringViolation] {
    let viewDeclaration = /(?:struct|extension)\s+[^{]*\b(?:View|ViewModifier)\b[^{]*\{/
    var violations: [ViewStringViolation] = []
    var search = source.startIndex
    while let match = source[search...].firstMatch(of: viewDeclaration) {
        let open = source.index(before: match.range.upperBound)
        guard source[open] == "{", let close = matchingBrace(from: open, in: source) else {
            search = match.range.upperBound
            continue
        }
        let body = open..<source.index(after: close)
        violations.append(contentsOf: rawLiterals(in: source, range: body))
        search = body.upperBound
    }
    return violations
}

private func rawLiterals(in source: String, range: Range<String.Index>) -> [ViewStringViolation] {
    var violations: [ViewStringViolation] = []
    var index = range.lowerBound
    while index < range.upperBound {
        if source[index...].hasPrefix("//") {
            index = lineEnd(from: index, in: source)
            continue
        }
        if source[index...].hasPrefix("/*") {
            if let end = source[index...].range(of: "*/") {
                index = end.upperBound
            } else {
                break
            }
            continue
        }
        if let literal = stringLiteral(from: index, in: source), literal.end <= range.upperBound {
            if !isVerbatimArgument(endingAt: literal.start, in: source) {
                violations.append(ViewStringViolation(line: lineNumber(of: literal.start, in: source), snippet: literal.preview))
            }
            index = literal.end
            continue
        }
        index = source.index(after: index)
    }
    return violations
}

private func matchingBrace(from open: String.Index, in source: String) -> String.Index? {
    var depth = 0
    var index = open
    while index < source.endIndex {
        if source[index...].hasPrefix("//") {
            index = lineEnd(from: index, in: source)
            continue
        }
        if source[index...].hasPrefix("/*") {
            if let end = source[index...].range(of: "*/") {
                index = end.upperBound
            } else {
                return nil
            }
            continue
        }
        if let literal = stringLiteral(from: index, in: source) {
            index = literal.end
            continue
        }
        if source[index] == "{" {
            depth += 1
        } else if source[index] == "}" {
            depth -= 1
            if depth == 0 { return index }
        }
        index = source.index(after: index)
    }
    return nil
}

private struct LiteralSpan {
    var start: String.Index
    var end: String.Index
    var preview: String
}

private func stringLiteral(from index: String.Index, in source: String) -> LiteralSpan? {
    let rest = source[index...]
    if rest.hasPrefix("\"\"\"") {
        guard let end = source[source.index(index, offsetBy: 3)...].range(of: "\"\"\"") else { return nil }
        return LiteralSpan(start: index, end: end.upperBound, preview: "multiline string")
    }
    var hashes = 0
    var cursor = index
    while cursor < source.endIndex, source[cursor] == "#" {
        hashes += 1
        cursor = source.index(after: cursor)
    }
    guard cursor < source.endIndex, source[cursor] == "\"" else { return nil }
    let opener = source.index(after: cursor)
    let closer = String(repeating: "\"", count: 1) + String(repeating: "#", count: hashes)
    var scan = opener
    while scan < source.endIndex {
        if hashes == 0, source[scan] == "\\", source.index(after: scan) < source.endIndex {
            scan = source.index(scan, offsetBy: 2, limitedBy: source.endIndex) ?? source.endIndex
            continue
        }
        if source[scan...].hasPrefix(closer) {
            let end = source.index(scan, offsetBy: closer.count)
            let preview = String(source[index..<end].prefix(48))
            return LiteralSpan(start: index, end: end, preview: preview)
        }
        scan = source.index(after: scan)
    }
    return nil
}

private func isVerbatimArgument(endingAt index: String.Index, in source: String) -> Bool {
    let label = Array("verbatim")
    var cursor = index
    while cursor > source.startIndex {
        let previous = source.index(before: cursor)
        if source[previous].isWhitespace {
            cursor = previous
            continue
        }
        break
    }
    guard cursor > source.startIndex else { return false }
    let colon = source.index(before: cursor)
    guard source[colon] == ":" else { return false }
    cursor = colon
    while cursor > source.startIndex {
        let previous = source.index(before: cursor)
        if source[previous].isWhitespace {
            cursor = previous
            continue
        }
        break
    }
    guard source.distance(from: source.startIndex, to: cursor) >= label.count else { return false }
    let start = source.index(cursor, offsetBy: -label.count)
    return Array(source[start..<cursor]) == label
}

private func lineEnd(from index: String.Index, in source: String) -> String.Index {
    var cursor = index
    while cursor < source.endIndex, source[cursor] != "\n" {
        cursor = source.index(after: cursor)
    }
    return cursor < source.endIndex ? source.index(after: cursor) : cursor
}

private func lineNumber(of index: String.Index, in source: String) -> Int {
    source[..<index].reduce(1) { count, character in
        character == "\n" ? count + 1 : count
    }
}

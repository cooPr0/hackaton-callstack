import Foundation

/// A room code pulled out of a typed string or a link.
///
/// Accepts `TX3WB`, `tintandtell://join/TX3WB`, and
/// `https://tint-and-tell.pages.dev/room/TX3WB` (also `/join/`).
public enum RoomLink {
    public static let length = 5
    /// Unambiguous alphabet: no I, L, O, 0, or 1.
    public static let alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

    public static func code(from raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        if trimmed.contains("://"), let url = URL(string: trimmed), let code = code(from: url) {
            return code
        }
        return exact(trimmed)
    }

    public static func code(from url: URL) -> String? {
        var pieces = url.path.split(separator: "/").map(String.init)
        if let host = url.host, !host.contains(".") {
            pieces.append(host)
        }
        for piece in pieces.reversed() {
            if let code = exact(piece) { return code }
        }
        return nil
    }

    private static func exact(_ raw: String) -> String? {
        let filtered = raw.uppercased().filter { alphabet.contains($0) }
        guard filtered.count == length else { return nil }
        return String(filtered)
    }
}

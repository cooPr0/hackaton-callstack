import Foundation
import TintKit

/// The latest room link the system handed the app. A new arrival gets a new id,
/// so opening the same code twice still reaches the join screen.
@MainActor
@Observable
final class IncomingLink {
    struct Arrival: Equatable {
        var id = UUID()
        var code: String
    }

    var arrival: Arrival?

    func open(_ url: URL) {
        guard let code = RoomLink.code(from: url) else { return }
        arrival = Arrival(code: code)
    }
}

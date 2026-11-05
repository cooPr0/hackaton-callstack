import Foundation
import TintKit

/// One joined seat. The server's latest view is what the screen draws.
@MainActor
@Observable
final class RoomSession {
    static let nameKey = "tint.playerName"

    let code: String
    private(set) var playerView: PlayerView?
    private(set) var connected = false
    private var client: RoomClient?
    private var listen: Task<Void, Never>?

    init(code: String) {
        self.code = code
    }

    func connect(tokens: [String], name: String?) async throws {
        guard let client = RemoteRoom.client(code: code, tokens: tokens, name: name) else {
            throw APIError.network
        }
        self.client = client
        listen?.cancel()
        listen = Task { [weak self] in
            guard let client = self?.client else { return }
            for await message in client.messages {
                guard let self else { return }
                if case .view(_, let view) = message {
                    self.playerView = view
                }
            }
        }
        try await client.connect()
        connected = true
    }

    func place(x: Int, y: Int) async {
        guard let view = playerView, let seat = view.turnSeatId, view.you.contains(seat) else { return }
        try? await client?.placeStone(seatId: seat, x: x, y: y)
    }

    func leave() {
        listen?.cancel()
        let client = client
        self.client = nil
        Task { await client?.close() }
    }
}

import Foundation
import Testing
import TintKit

@Suite("Live server", .enabled(if: ProcessInfo.processInfo.environment["TINT_LIVE"] == "1"))
struct LiveServerTests {
    @Test("Production health, then a lobby view on the socket")
    func productionLobby() async throws {
        let api = APIClient(config: .production)
        let health = try await api.health()
        #expect(health.ok)
        #expect(health.protocolVersion == ProtocolConstant.version)

        let created = try await api.createRoom(
            CreateRoomRequest(
                mode: .stol,
                local: true,
                seats: [
                    .init(name: "Kuba", kind: .human),
                    .init(name: "Ola", kind: .human),
                    .init(name: "Grok", kind: .grok),
                ],
                botMode: .fallback
            )
        )
        let tokens = created.seats.map(\.token)
        let url = try #require(ServerConfig.production.webSocketURL(code: created.code, tokens: tokens))
        let client = RoomClient(url: url, name: "Kuba", ackTimeout: .seconds(8), maxAttempts: 1)
        let box = LiveBox()
        let collect = Task {
            for await message in client.messages {
                if case .view = message {
                    box.mark()
                    break
                }
            }
        }
        try await client.connect()
        for _ in 0..<50 where !box.seen {
            try await Task.sleep(for: .milliseconds(100))
        }
        await client.close()
        await collect.value
        #expect(box.seen)
    }
}

private final class LiveBox: @unchecked Sendable {
    private let lock = NSLock()
    private var value = false

    var seen: Bool {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    func mark() {
        lock.lock()
        value = true
        lock.unlock()
    }
}

import Testing
import TintCore

enum Support {
    static let host = "s1"

    static func config(total: Int = 6) throws -> LocalGameConfig {
        try LocalGameConfig(
            totalRounds: total,
            hostSeatId: host,
            seatIds: ["s1", "s2", "s3"],
            setup: { index, _ in
                RoundSetup(
                    cueGiverSeatId: index.isMultiple(of: 2) ? "s2" : "s1",
                    secret: RoundSecret(
                        target: RoundSecret.Cell(x: index, y: 1),
                        window: RoundSecret.Window(x0: 0, y0: 0)
                    )
                )
            }
        )
    }

    static func engine(total: Int = 6) throws -> LocalGameEngine {
        LocalGameEngine(config: try config(total: total))
    }

    static let playPhases: [GamePhase] = [.secret1, .guess1, .secret2, .guess2, .reveal]
}

struct NextCase: Sendable, CustomTestStringConvertible {
    let index: Int
    let total: Int
    let nextIndex: Int
    let gameOver: Bool

    var testDescription: String {
        "round \(index)/\(total)"
    }
}

actor FakeTransport: GameTransport {
    struct Boom: Error {}

    nonisolated let updates: AsyncStream<RoundUpdate>
    private let continuation: AsyncStream<RoundUpdate>.Continuation
    private var shouldFail = false
    private(set) var sent: [GameIntent] = []

    init() {
        let (stream, continuation) = AsyncStream<RoundUpdate>.makeStream()
        updates = stream
        self.continuation = continuation
    }

    func send(_ intent: GameIntent) async throws {
        if shouldFail { throw Boom() }
        sent.append(intent)
    }

    func failNextSend() {
        shouldFail = true
    }

    func push(_ update: RoundUpdate) {
        continuation.yield(update)
    }

    func finish() {
        continuation.finish()
    }
}

/// A projected round from the server. `seq` is the view sequence; stale values are dropped.
public struct RoundUpdate: Sendable, Equatable {
    public let seq: Int
    public let round: RoundDefinition
    public let paused: Bool

    public init(seq: Int, round: RoundDefinition, paused: Bool) {
        self.seq = seq
        self.round = round
        self.paused = paused
    }
}

/// Socket boundary. TintKit implements this; tests inject an in-memory transport.
public protocol GameTransport: Sendable {
    func send(_ intent: GameIntent) async throws
    var updates: AsyncStream<RoundUpdate> { get }
}

/// Online driver. It does not pick targets, score stones, or advance the phase on its own.
public actor NetworkGameEngine: GameEngine {
    public nonisolated let backend: GameBackend = .network
    public nonisolated let rounds: AsyncStream<RoundDefinition>

    private let continuation: AsyncStream<RoundDefinition>.Continuation
    private let transport: any GameTransport
    private var current: RoundDefinition?
    private var paused = false
    public private(set) var lastSeq = 0

    public init(transport: any GameTransport) {
        self.transport = transport
        let (stream, continuation) = AsyncStream<RoundDefinition>.makeStream()
        self.rounds = stream
        self.continuation = continuation
    }

    public var round: RoundDefinition? { current }
    public var isPaused: Bool { paused }

    public func send(_ intent: GameIntent) async throws(GameEngineError) {
        do {
            try await transport.send(intent)
        } catch {
            throw .transport(String(describing: error))
        }
    }

    /// Reads `transport.updates` until the stream finishes. Call from one structured task.
    public func run() async {
        for await update in transport.updates {
            guard update.seq > lastSeq else { continue }
            lastSeq = update.seq
            paused = update.paused
            current = update.round
            continuation.yield(update.round)
        }
    }

    deinit {
        continuation.finish()
    }
}

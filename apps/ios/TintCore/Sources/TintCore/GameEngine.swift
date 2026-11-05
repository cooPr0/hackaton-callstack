/// Chosen once when the session is created. Never inferred from phase or from who holds the phone.
public enum GameBackend: Sendable, Equatable {
    case local
    case network

    public init(local: Bool) {
        self = local ? .local : .network
    }
}

public enum GameEngineError: Error, Sendable, Equatable {
    case wrongPhase(GamePhase)
    case notHost
    case notYourTurn
    case invalidClue
    case cellTaken
    case outOfBounds
    case paused
    case transport(String)
}

/// A match driver. The local engine advances rounds. The network engine only forwards intents.
public protocol GameEngine: Actor {
    nonisolated var backend: GameBackend { get }
    nonisolated var rounds: AsyncStream<RoundDefinition> { get }
    var round: RoundDefinition? { get }
    var isPaused: Bool { get }
    func send(_ intent: GameIntent) async throws(GameEngineError)
}

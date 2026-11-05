public struct LocalGameConfig: Sendable {
    public let totalRounds: Int
    public let hostSeatId: String
    public let seatIds: [String]
    public let setup: RoundSetupProvider

    public init(
        totalRounds: Int = RoundDefinition.defaultTotal,
        hostSeatId: String,
        seatIds: [String],
        setup: @escaping RoundSetupProvider
    ) throws(RoundAlignmentError) {
        guard RoundDefinition.totalRange.contains(totalRounds) else {
            throw .totalOutOfRange(totalRounds)
        }
        self.totalRounds = totalRounds
        self.hostSeatId = hostSeatId
        self.seatIds = seatIds
        self.setup = setup
    }
}

/// Pass-and-play driver. It owns the target and applies only the transitions that need no scoring.
public actor LocalGameEngine: GameEngine {
    public nonisolated let backend: GameBackend = .local
    public nonisolated let rounds: AsyncStream<RoundDefinition>

    private let continuation: AsyncStream<RoundDefinition>.Continuation
    private let config: LocalGameConfig
    private var current: RoundDefinition
    private var paused = false
    private var storedSecret: RoundSecret?

    public init(config: LocalGameConfig) {
        self.init(
            config: config,
            round: RoundDefinition.assumingValid(
                index: 0,
                total: config.totalRounds,
                phase: .lobby,
                cueGiverSeatId: nil,
                turnSeatId: nil
            ),
            secret: nil
        )
    }

    /// Starts at an already-valid round. Used to resume at REVEAL, which local rules cannot reach yet.
    public init(config: LocalGameConfig, resumingAt round: RoundDefinition) {
        let secret = round.index >= 1 ? config.setup(round.index, config.seatIds).secret : nil
        self.init(config: config, round: round, secret: secret)
    }

    private init(config: LocalGameConfig, round: RoundDefinition, secret: RoundSecret?) {
        self.config = config
        self.current = round
        self.storedSecret = secret
        let (stream, continuation) = AsyncStream<RoundDefinition>.makeStream()
        self.rounds = stream
        self.continuation = continuation
    }

    public var round: RoundDefinition? { current }
    public var isPaused: Bool { paused }

    /// Non-nil for the cue giver before reveal, and for every seat once the target is public
    /// (REVEAL, and GAME_OVER on this local engine). The wire's GAME_OVER view has no `secret`.
    /// Lobby has no target. The value is never copied onto `RoundDefinition`.
    public func secret(for seatId: String) -> RoundSecret? {
        guard let storedSecret else { return nil }
        if current.phase.revealsSecretToAll { return storedSecret }
        guard current.phase.isPlay, current.cueGiverSeatId == seatId else { return nil }
        return storedSecret
    }

    public func send(_ intent: GameIntent) async throws(GameEngineError) {
        switch intent {
        case .clue, .stone, .skip:
            throw .rulesNotPorted
        case .start(let by):
            guard current.phase == .lobby else { throw .wrongPhase(current.phase) }
            try requireHost(by)
            let setup = config.setup(1, config.seatIds)
            publish(
                RoundDefinition.assumingValid(
                    index: 1,
                    total: current.total,
                    phase: .secret1,
                    cueGiverSeatId: setup.cueGiverSeatId,
                    turnSeatId: nil
                ),
                secret: setup.secret
            )
        case .next(let by):
            guard current.phase == .reveal else { throw .wrongPhase(current.phase) }
            try requireHost(by)
            if current.isLastRound {
                publish(
                    RoundDefinition.assumingValid(
                        index: current.index,
                        total: current.total,
                        phase: .gameOver,
                        cueGiverSeatId: nil,
                        turnSeatId: nil
                    ),
                    secret: storedSecret
                )
            } else {
                let setup = config.setup(current.index + 1, config.seatIds)
                publish(
                    RoundDefinition.assumingValid(
                        index: current.index + 1,
                        total: current.total,
                        phase: .secret1,
                        cueGiverSeatId: setup.cueGiverSeatId,
                        turnSeatId: nil
                    ),
                    secret: setup.secret
                )
            }
        case .pause(let paused, _):
            self.paused = paused
        case .end(let by):
            try requireHost(by)
            guard current.phase != .gameOver else { return }
            publish(
                RoundDefinition.assumingValid(
                    index: current.index,
                    total: current.total,
                    phase: .gameOver,
                    cueGiverSeatId: nil,
                    turnSeatId: nil
                ),
                secret: storedSecret
            )
        }
    }

    private func requireHost(_ by: String) throws(GameEngineError) {
        guard by == config.hostSeatId else { throw .notHost }
    }

    private func publish(_ next: RoundDefinition, secret: RoundSecret?) {
        current = next
        storedSecret = secret
        continuation.yield(next)
    }

    deinit {
        continuation.finish()
    }
}

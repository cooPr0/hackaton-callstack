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

/// Pass-and-play driver. It owns the target, clues, and stones. Scoring stays off this device.
public actor LocalGameEngine: GameEngine {
    public nonisolated let backend: GameBackend = .local
    public nonisolated let rounds: AsyncStream<RoundDefinition>

    private let continuation: AsyncStream<RoundDefinition>.Continuation
    private let config: LocalGameConfig
    private var current: RoundDefinition
    private var paused = false
    private var storedSecret: RoundSecret?
    private var clueList: [String] = []
    private var stoneList: [RoundSecret.Cell] = []
    private var turnOrder: [String] = []
    private var turnIndex = 0

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
        self.turnOrder = Self.guessers(after: round.cueGiverSeatId, in: config.seatIds)
        if round.phase.isGuess, let turn = round.turnSeatId, let index = turnOrder.firstIndex(of: turn) {
            self.turnIndex = index
        }
        let (stream, continuation) = AsyncStream<RoundDefinition>.makeStream()
        self.rounds = stream
        self.continuation = continuation
    }

    public var round: RoundDefinition? { current }
    public var isPaused: Bool { paused }
    public var clueTexts: [String] { clueList }
    public var occupied: [RoundSecret.Cell] { stoneList }

    /// Non-nil for the cue giver before reveal, and for every seat once the target is public.
    /// Lobby has no target. The value is never copied onto `RoundDefinition`.
    public func secret(for seatId: String) -> RoundSecret? {
        guard let storedSecret else { return nil }
        if current.phase.revealsSecretToAll { return storedSecret }
        guard current.phase.isPlay, current.cueGiverSeatId == seatId else { return nil }
        return storedSecret
    }

    public func send(_ intent: GameIntent) async throws(GameEngineError) {
        if paused, case .clue = intent { throw .paused }
        if paused, case .stone = intent { throw .paused }
        if paused, case .skip = intent { throw .paused }
        switch intent {
        case .clue(let seatId, let text):
            guard current.phase == .secret1 || current.phase == .secret2 else { throw .wrongPhase(current.phase) }
            guard seatId == current.cueGiverSeatId else { throw .notYourTurn }
            guard let word = ClueText.normalized(text, phase: current.phase) else { throw .invalidClue }
            clueList.append(word)
            turnIndex = 0
            publish(
                RoundDefinition.assumingValid(
                    index: current.index,
                    total: current.total,
                    phase: current.phase == .secret1 ? .guess1 : .guess2,
                    cueGiverSeatId: current.cueGiverSeatId,
                    turnSeatId: turnOrder.first
                ),
                secret: storedSecret
            )
        case .stone(let seatId, let x, let y):
            try place(seatId: seatId, x: x, y: y, keepStone: true)
        case .skip(let seatId, _):
            try place(seatId: seatId, x: nil, y: nil, keepStone: false)
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

    private func place(seatId: String, x: Int?, y: Int?, keepStone: Bool) throws(GameEngineError) {
        guard current.phase.isGuess else { throw .wrongPhase(current.phase) }
        guard seatId == current.turnSeatId else { throw .notYourTurn }
        if keepStone, let x, let y {
            guard (0..<24).contains(x), (0..<12).contains(y) else { throw .outOfBounds }
            let cell = RoundSecret.Cell(x: x, y: y)
            guard !stoneList.contains(cell) else { throw .cellTaken }
            stoneList.append(cell)
        }
        turnIndex += 1
        if turnIndex < turnOrder.count {
            publish(
                RoundDefinition.assumingValid(
                    index: current.index,
                    total: current.total,
                    phase: current.phase,
                    cueGiverSeatId: current.cueGiverSeatId,
                    turnSeatId: turnOrder[turnIndex]
                ),
                secret: storedSecret
            )
            return
        }
        if current.phase == .guess1 {
            turnIndex = 0
            publish(
                RoundDefinition.assumingValid(
                    index: current.index,
                    total: current.total,
                    phase: .secret2,
                    cueGiverSeatId: current.cueGiverSeatId,
                    turnSeatId: nil
                ),
                secret: storedSecret
            )
            return
        }
        publish(
            RoundDefinition.assumingValid(
                index: current.index,
                total: current.total,
                phase: .reveal,
                cueGiverSeatId: current.cueGiverSeatId,
                turnSeatId: nil
            ),
            secret: storedSecret
        )
    }

    private func requireHost(_ by: String) throws(GameEngineError) {
        guard by == config.hostSeatId else { throw .notHost }
    }

    /// Seats after the cue giver, wrapping around. The cue giver does not guess.
    static func guessers(after cue: String?, in seats: [String]) -> [String] {
        guard let cue, let index = seats.firstIndex(of: cue) else { return [] }
        return Array(seats[(index + 1)...]) + Array(seats[..<index])
    }

    private func publish(_ next: RoundDefinition, secret: RoundSecret?) {
        if next.phase == .secret1 && next.index != current.index {
            clueList = []
            stoneList = []
            turnOrder = Self.guessers(after: next.cueGiverSeatId, in: config.seatIds)
            turnIndex = 0
        }
        current = next
        storedSecret = secret
        continuation.yield(next)
    }

    deinit {
        continuation.finish()
    }
}

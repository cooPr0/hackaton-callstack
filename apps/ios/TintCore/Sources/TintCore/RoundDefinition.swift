/// Fields a player-facing view must expose for the engine to read the current round.
/// `PlayerView` in TintKit conforms to this. TintCore does not define a second view.
public protocol RoundViewFields {
    var phase: GamePhase { get }
    var round: Int { get }
    var totalRounds: Int { get }
    var cueGiverSeatId: String? { get }
    var turnSeatId: String? { get }
}

/// A flat view-shaped value. Tests and fixture replays use it; the app uses TintKit's view.
public struct RoundViewSnapshot: RoundViewFields, Sendable, Equatable {
    public var phase: GamePhase
    public var round: Int
    public var totalRounds: Int
    public var cueGiverSeatId: String?
    public var turnSeatId: String?

    public init(
        phase: GamePhase,
        round: Int,
        totalRounds: Int,
        cueGiverSeatId: String?,
        turnSeatId: String?
    ) {
        self.phase = phase
        self.round = round
        self.totalRounds = totalRounds
        self.cueGiverSeatId = cueGiverSeatId
        self.turnSeatId = turnSeatId
    }
}

public enum RoundAlignmentError: Error, Sendable, Equatable {
    case totalOutOfRange(Int)
    case lobbyMustBeZero(Int)
    case indexOutOfRange(index: Int, total: Int)
    case cueGiverMismatch
    case turnOutsideGuess
}

/// Where the match is in the round sequence.
///
/// Aligned with both sides of the contract:
/// - `index` is `RoundState.round` and `PlayerView.round` (0 in the lobby, else 1...total).
/// - `total` is `GameState.totalRounds` / `PlayerView.totalRounds` (1...12, default 6).
/// - `phase` lives on the game, not inside `RoundState`.
/// - `turnSeatId` is the projection of `turnOrder[turnIndex]`.
///
/// The target stays off this type. `GAME_OVER` keeps the last index and clears the cue giver,
/// matching `shared/fixtures/views/gameover.json` (`round: 6`, `cueGiverSeatId: null`).
public struct RoundDefinition: Sendable, Equatable {
    public static let totalRange: ClosedRange<Int> = 1...12
    public static let defaultTotal = 6

    public let index: Int
    public let total: Int
    public let phase: GamePhase
    public let cueGiverSeatId: String?
    public let turnSeatId: String?

    public init(
        index: Int,
        total: Int,
        phase: GamePhase,
        cueGiverSeatId: String?,
        turnSeatId: String?
    ) throws(RoundAlignmentError) {
        guard Self.totalRange.contains(total) else { throw .totalOutOfRange(total) }

        switch phase {
        case .lobby:
            guard index == 0 else { throw .lobbyMustBeZero(index) }
        case .gameOver:
            guard (0...total).contains(index) else { throw .indexOutOfRange(index: index, total: total) }
        case .secret1, .guess1, .secret2, .guess2, .reveal:
            guard (1...total).contains(index) else { throw .indexOutOfRange(index: index, total: total) }
        }

        switch phase {
        case .lobby, .gameOver:
            guard cueGiverSeatId == nil else { throw .cueGiverMismatch }
        case .secret1, .guess1, .secret2, .guess2, .reveal:
            guard cueGiverSeatId != nil else { throw .cueGiverMismatch }
        }

        if phase.isGuess {
            guard turnSeatId != nil else { throw .turnOutsideGuess }
        } else {
            guard turnSeatId == nil else { throw .turnOutsideGuess }
        }

        self.index = index
        self.total = total
        self.phase = phase
        self.cueGiverSeatId = cueGiverSeatId
        self.turnSeatId = turnSeatId
    }

    public init(view: some RoundViewFields) throws(RoundAlignmentError) {
        try self.init(
            index: view.round,
            total: view.totalRounds,
            phase: view.phase,
            cueGiverSeatId: view.cueGiverSeatId,
            turnSeatId: view.turnSeatId
        )
    }

    public static func lobby(total: Int) throws(RoundAlignmentError) -> RoundDefinition {
        try RoundDefinition(
            index: 0,
            total: total,
            phase: .lobby,
            cueGiverSeatId: nil,
            turnSeatId: nil
        )
    }

    public var isLobby: Bool { phase == .lobby }
    /// True when this index is the last scheduled round (`index == total`).
    public var isLastRound: Bool { index == total }
    public var isGameOver: Bool { phase == .gameOver }

    /// Builds a round the engine has already checked. A failure here is a programming error.
    static func assumingValid(
        index: Int,
        total: Int,
        phase: GamePhase,
        cueGiverSeatId: String?,
        turnSeatId: String?
    ) -> RoundDefinition {
        do {
            return try RoundDefinition(
                index: index,
                total: total,
                phase: phase,
                cueGiverSeatId: cueGiverSeatId,
                turnSeatId: turnSeatId
            )
        } catch {
            preconditionFailure("aligned round rejected: \(error)")
        }
    }
}

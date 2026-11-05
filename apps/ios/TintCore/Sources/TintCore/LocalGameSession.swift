/// A person at a local table. The agent takes a seat in this order and gives clues on its rounds.
public enum PlayerKind: String, Sendable, Equatable {
    case human
    case agent
}

public struct LocalPlayer: Sendable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let kind: PlayerKind

    public init(id: String, name: String, kind: PlayerKind) {
        self.id = id
        self.name = name
        self.kind = kind
    }
}

public enum LocalPlayError: Error, Sendable, Equatable {
    case notAgentTurn
    case engine(GameEngineError)
    case grok(GrokClientError)
}

public enum LocalSessionError: Error, Sendable, Equatable {
    case tooFewPlayers
    case tooManyPlayers
    case alignment(RoundAlignmentError)
}

/// Pass-and-play match on this device. Built once as `GameBackend.local`.
///
/// Humans and the optional agent share one rotation: round 1 is the first human, then each
/// following seat, including the agent. The agent is not a separate "always guesses first" role.
/// The phone reads a target only through `secretForHuman`. `secretForAgent` is the model's view
/// of its own clue, and it is empty on a human's round.
public struct LocalGameSession: Sendable {
    public static let playerRange: ClosedRange<Int> = 2...6

    public let players: [LocalPlayer]
    public let hostSeatId: String
    public let seed: Int32
    public let session: GameSession

    public var backend: GameBackend { session.backend }

    private var engine: LocalGameEngine {
        guard let engine = session.engine as? LocalGameEngine else {
            preconditionFailure("local session was built with a network engine")
        }
        return engine
    }

    public static func open(
        humans: [String],
        agent: String? = nil,
        rounds: Int = RoundDefinition.defaultTotal,
        seed: Int32
    ) throws(LocalSessionError) -> LocalGameSession {
        let players = try roster(humans: humans, agent: agent)
        let config = try makeConfig(players: players, rounds: rounds, seed: seed)
        return LocalGameSession(players: players, seed: seed, session: GameSession(.local(config)))
    }

    /// Continues a match the local rules cannot reach yet (reveal, a later round).
    public static func resume(
        at round: RoundDefinition,
        humans: [String],
        agent: String? = nil,
        seed: Int32
    ) throws(LocalSessionError) -> LocalGameSession {
        let players = try roster(humans: humans, agent: agent)
        let config = try makeConfig(players: players, rounds: round.total, seed: seed)
        let engine = LocalGameEngine(config: config, resumingAt: round)
        return LocalGameSession(players: players, seed: seed, session: GameSession(local: engine))
    }

    private init(players: [LocalPlayer], seed: Int32, session: GameSession) {
        self.players = players
        self.hostSeatId = players[0].id
        self.seed = seed
        self.session = session
    }

    /// Seat who gives the clue for `index` (1...total). Order is the roster, agent included.
    public func cueGiver(forRound index: Int) -> LocalPlayer {
        players[(index - 1) % players.count]
    }

    public var round: RoundDefinition? {
        get async { await engine.round }
    }

    public func start() async throws(GameEngineError) {
        try await engine.send(.start(by: hostSeatId))
    }

    public func next() async throws(GameEngineError) {
        try await engine.send(.next(by: hostSeatId))
    }

    public func end() async throws(GameEngineError) {
        try await engine.send(.end(by: hostSeatId))
    }

    public func pause(_ paused: Bool) async throws(GameEngineError) {
        try await engine.send(.pause(paused, by: hostSeatId))
    }

    public func clueTexts() async -> [String] { await engine.clueTexts }
    public func occupied() async -> [RoundSecret.Cell] { await engine.occupied }

    public func submitClue(_ text: String, by seatId: String) async throws(GameEngineError) {
        try await engine.send(.clue(seatId: seatId, text: text))
    }

    public func place(x: Int, y: Int, by seatId: String) async throws(GameEngineError) {
        try await engine.send(.stone(seatId: seatId, x: x, y: y))
    }

    /// When the agent is the cue giver or the guesser, ask Grok on this phone and apply the move.
    public func playAgent(using client: any GrokLiveClient) async throws(LocalPlayError) -> String {
        guard let round = await engine.round else { throw .notAgentTurn }
        if round.phase == .secret1 || round.phase == .secret2,
            let cue = round.cueGiverSeatId,
            players.first(where: { $0.id == cue })?.kind == .agent,
            let secret = await secretForAgent()
        {
            let spoken: (word: String, line: String)
            do {
                spoken = try await client.clueWord(secret: secret, phase: round.phase, clues: await engine.clueTexts)
            } catch {
                throw .grok(error)
            }
            do {
                try await engine.send(.clue(seatId: cue, text: spoken.word))
            } catch {
                throw .engine(error)
            }
            return spoken.line
        }
        if round.phase.isGuess,
            let turn = round.turnSeatId,
            players.first(where: { $0.id == turn })?.kind == .agent
        {
            let taken = await engine.occupied
            let guess: GrokGuess
            do {
                guess = try await client.guess(clues: await engine.clueTexts, taken: taken)
            } catch {
                throw .grok(error)
            }
            let cell = nearestFree(x: guess.x, y: guess.y, taken: taken)
            do {
                try await engine.send(.stone(seatId: turn, x: cell.x, y: cell.y))
            } catch {
                throw .engine(error)
            }
            return guess.line
        }
        throw .notAgentTurn
    }

    private func nearestFree(x: Int, y: Int, taken: [RoundSecret.Cell]) -> RoundSecret.Cell {
        let blocked = Set(taken.map { "\($0.x),\($0.y)" })
        let clamped = RoundSecret.Cell(x: min(max(x, 0), 23), y: min(max(y, 0), 11))
        if !blocked.contains("\(clamped.x),\(clamped.y)") { return clamped }
        var best = clamped
        var bestDistance = Int.max
        for row in 0..<12 {
            for column in 0..<24 where !blocked.contains("\(column),\(row)") {
                let distance = max(abs(column - x), abs(row - y))
                if distance < bestDistance {
                    bestDistance = distance
                    best = RoundSecret.Cell(x: column, y: row)
                }
            }
        }
        return best
    }

    /// Target for the human holding the phone. Nil for every human when the agent is cue giver.
    public func secretForHuman(_ seatId: String) async -> RoundSecret? {
        guard players.first(where: { $0.id == seatId })?.kind == .human else { return nil }
        return await engine.secret(for: seatId)
    }

    /// Target for the agent on its own clue. Nil while a human holds the viewfinder.
    public func secretForAgent() async -> RoundSecret? {
        guard let cue = await engine.round?.cueGiverSeatId,
            players.first(where: { $0.id == cue })?.kind == .agent
        else { return nil }
        return await engine.secret(for: cue)
    }

    private static func roster(humans: [String], agent: String?) throws(LocalSessionError) -> [LocalPlayer] {
        var players: [LocalPlayer] = humans.enumerated().map { offset, name in
            LocalPlayer(id: "s\(offset + 1)", name: name, kind: .human)
        }
        if let agent {
            players.append(LocalPlayer(id: "s\(players.count + 1)", name: agent, kind: .agent))
        }
        guard players.count >= playerRange.lowerBound else { throw .tooFewPlayers }
        guard players.count <= playerRange.upperBound else { throw .tooManyPlayers }
        return players
    }

    private static func makeConfig(
        players: [LocalPlayer],
        rounds: Int,
        seed: Int32
    ) throws(LocalSessionError) -> LocalGameConfig {
        do {
            return try LocalGameConfig(
                totalRounds: rounds,
                hostSeatId: players[0].id,
                seatIds: players.map(\.id),
                setup: { index, seatIds in
                    RoundSetup(
                        cueGiverSeatId: seatIds[(index - 1) % seatIds.count],
                        secret: TargetPicker.secret(seed: seed, round: index)
                    )
                }
            )
        } catch {
            throw .alignment(error)
        }
    }
}

/// Same mulberry32 step as `packages/game-core` `nextRandom`, then the 7×9 viewfinder clamp.
enum TargetPicker {
    private static let columns = 24
    private static let rows = 12
    private static let viewfinderWidth = 7
    private static let viewfinderHeight = 9

    static func secret(seed: Int32, round: Int) -> RoundSecret {
        var state = seed
        var x = 0
        var y = 0
        for _ in 0..<round {
            let (rx, s1) = nextRandom(state)
            let (ry, s2) = nextRandom(s1)
            state = s2
            x = Int(rx * Double(columns))
            y = Int(ry * Double(rows))
        }
        return RoundSecret(
            target: RoundSecret.Cell(x: x, y: y),
            window: RoundSecret.Window(
                x0: min(max(x - 3, 0), columns - viewfinderWidth),
                y0: min(max(y - 4, 0), rows - viewfinderHeight)
            )
        )
    }

    /// One mulberry32 step. `seed` is the JS `Int32` left in `GameState.rngSeed`.
    private static func nextRandom(_ seed: Int32) -> (Double, Int32) {
        let s = seed &+ Int32(bitPattern: 0x6D2B_79F5)
        var t = imul(s ^ Int32(bitPattern: UInt32(bitPattern: s) >> 15), s | 1)
        let mixed = imul(t ^ Int32(bitPattern: UInt32(bitPattern: t) >> 7), t | 61)
        t ^= t &+ mixed
        let unit = Double(UInt32(bitPattern: t ^ Int32(bitPattern: UInt32(bitPattern: t) >> 14)))
        return (unit / 4_294_967_296, s)
    }

    private static func imul(_ a: Int32, _ b: Int32) -> Int32 {
        Int32(bitPattern: UInt32(bitPattern: a) &* UInt32(bitPattern: b))
    }
}

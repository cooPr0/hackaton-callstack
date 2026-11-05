import Testing
import TintCore

@Suite("Local engine transitions")
struct LocalEngineTransitionTests {
    @Test("Start opens round 1 in SECRET_1")
    func startGoesToRoundOne() async throws {
        let engine = try Support.engine()
        try await engine.send(.start(by: Support.host))
        let round = try #require(await engine.round)
        #expect(round.phase == .secret1)
        #expect(round.index == 1)
        #expect(round.cueGiverSeatId == "s1")
        #expect(round.turnSeatId == nil)
    }

    @Test(
        "Next advances until the last round, then ends",
        arguments: [
            NextCase(index: 1, total: 3, nextIndex: 2, gameOver: false),
            NextCase(index: 2, total: 3, nextIndex: 3, gameOver: false),
            NextCase(index: 3, total: 3, nextIndex: 3, gameOver: true),
            NextCase(index: 1, total: 1, nextIndex: 1, gameOver: true),
        ]
    )
    func nextAdvancesOrEnds(_ sample: NextCase) async throws {
        let reveal = try RoundDefinition(
            index: sample.index,
            total: sample.total,
            phase: .reveal,
            cueGiverSeatId: "s1",
            turnSeatId: nil
        )
        let engine = LocalGameEngine(config: try Support.config(total: sample.total), resumingAt: reveal)
        try await engine.send(.next(by: Support.host))
        let round = try #require(await engine.round)
        #expect(round.index == sample.nextIndex)
        if sample.gameOver {
            #expect(round.phase == .gameOver)
            #expect(round.cueGiverSeatId == nil)
        } else {
            #expect(round.phase == .secret1)
            #expect(round.cueGiverSeatId != nil)
        }
    }

    @Test("Next is only legal in REVEAL", arguments: GamePhase.allCases.filter { $0 != .reveal })
    func nextOutsideRevealThrows(phase: GamePhase) async throws {
        let index = phase == .lobby || phase == .gameOver ? 0 : 1
        let cue: String? = phase.isPlay ? "s1" : nil
        let turn: String? = phase.isGuess ? "s2" : nil
        let round = try RoundDefinition(
            index: index,
            total: 6,
            phase: phase,
            cueGiverSeatId: cue,
            turnSeatId: turn
        )
        let engine = LocalGameEngine(config: try Support.config(), resumingAt: round)
        await #expect(throws: GameEngineError.wrongPhase(phase)) {
            try await engine.send(.next(by: Support.host))
        }
    }

    @Test("Start, next, and end require the host")
    func nonHostThrows() async throws {
        let engine = try Support.engine()
        await #expect(throws: GameEngineError.notHost) {
            try await engine.send(.start(by: "s2"))
        }

        let reveal = try RoundDefinition(
            index: 1,
            total: 6,
            phase: .reveal,
            cueGiverSeatId: "s1",
            turnSeatId: nil
        )
        let resumed = LocalGameEngine(config: try Support.config(), resumingAt: reveal)
        await #expect(throws: GameEngineError.notHost) {
            try await resumed.send(.next(by: "s2"))
        }
        await #expect(throws: GameEngineError.notHost) {
            try await engine.send(.end(by: "s2"))
        }
    }

    @Test("A clue opens guessing, and the last stone opens the second clue")
    func clueThenStones() async throws {
        let engine = try Support.engine()
        try await engine.send(.start(by: Support.host))
        try await engine.send(.clue(seatId: "s1", text: "Rosół"))
        let guessing = try #require(await engine.round)
        #expect(guessing.phase == .guess1)
        #expect(guessing.turnSeatId == "s2")
        #expect(await engine.clueTexts == ["Rosół"])

        try await engine.send(.stone(seatId: "s2", x: 1, y: 1))
        #expect((await engine.round)?.turnSeatId == "s3")
        try await engine.send(.stone(seatId: "s3", x: 2, y: 2))
        let second = try #require(await engine.round)
        #expect(second.phase == .secret2)
        #expect(second.turnSeatId == nil)

        await #expect(throws: GameEngineError.invalidClue) {
            try await engine.send(.clue(seatId: "s1", text: "niebieski"))
        }
        await #expect(throws: GameEngineError.cellTaken) {
            try await engine.send(.clue(seatId: "s1", text: "Garnek"))
            try await engine.send(.stone(seatId: "s2", x: 1, y: 1))
        }
    }

    @Test("Pause does not change the round")
    func pauseDoesNotTouchRound() async throws {
        let engine = try Support.engine()
        try await engine.send(.start(by: Support.host))
        let before = try #require(await engine.round)
        try await engine.send(.pause(true, by: "s2"))
        #expect(await engine.isPaused)
        #expect(await engine.round == before)
        try await engine.send(.pause(false, by: "s2"))
        #expect(await engine.isPaused == false)
        #expect(await engine.round == before)
    }

    @Test("End reaches game over from any phase", arguments: GamePhase.allCases)
    func endFromAnyPhase(phase: GamePhase) async throws {
        let index = phase == .lobby ? 0 : (phase == .gameOver ? 6 : 3)
        let cue: String? = phase.isPlay ? "s1" : nil
        let turn: String? = phase.isGuess ? "s2" : nil
        let round = try RoundDefinition(
            index: index,
            total: 6,
            phase: phase,
            cueGiverSeatId: cue,
            turnSeatId: turn
        )
        let engine = LocalGameEngine(config: try Support.config(), resumingAt: round)
        try await engine.send(.end(by: Support.host))
        let ended = try #require(await engine.round)
        #expect(ended.isGameOver)
        #expect(ended.index == index)
        #expect(ended.cueGiverSeatId == nil)
    }

    @Test("The round stream emits each transition")
    func roundsStreamEmitsEachTransition() async throws {
        let engine = try Support.engine()
        var iterator = engine.rounds.makeAsyncIterator()
        try await engine.send(.start(by: Support.host))
        try await engine.send(.end(by: Support.host))
        let first = await iterator.next()
        let second = await iterator.next()
        #expect(first?.phase == .secret1)
        #expect(first?.index == 1)
        #expect(second?.phase == .gameOver)
        #expect(second?.index == 1)
    }
}

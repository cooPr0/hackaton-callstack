import Testing
import TintCore

@Suite("Round definition")
struct RoundDefinitionTests {
    @Test("Lobby round is zero")
    func lobbyIsZero() throws {
        let lobby = try RoundDefinition(
            view: RoundViewSnapshot(
                phase: .lobby,
                round: 0,
                totalRounds: 6,
                cueGiverSeatId: nil,
                turnSeatId: nil
            )
        )
        #expect(lobby.isLobby)
        #expect(lobby.index == 0)

        #expect(throws: RoundAlignmentError.lobbyMustBeZero(1)) {
            try RoundDefinition(
                view: RoundViewSnapshot(
                    phase: .lobby,
                    round: 1,
                    totalRounds: 6,
                    cueGiverSeatId: nil,
                    turnSeatId: nil
                )
            )
        }
    }

    @Test("Play phases use 1...total", arguments: Support.playPhases)
    func inRoundIndexRange(phase: GamePhase) throws {
        let turn = phase.isGuess ? "s2" : nil
        for index in [1, 6] {
            let round = try RoundDefinition(
                index: index,
                total: 6,
                phase: phase,
                cueGiverSeatId: "s1",
                turnSeatId: turn
            )
            #expect(round.index == index)
        }
        for index in [0, 7] {
            #expect(throws: RoundAlignmentError.indexOutOfRange(index: index, total: 6)) {
                try RoundDefinition(
                    index: index,
                    total: 6,
                    phase: phase,
                    cueGiverSeatId: "s1",
                    turnSeatId: turn
                )
            }
        }
    }

    @Test("Total rounds stay inside 1...12", arguments: [0, 13])
    func totalBoundsRejected(total: Int) {
        #expect(throws: RoundAlignmentError.totalOutOfRange(total)) {
            try RoundDefinition.lobby(total: total)
        }
    }

    @Test("Default, minimum, and maximum totals are valid", arguments: [1, 6, 12])
    func totalBoundsAccepted(total: Int) throws {
        let lobby = try RoundDefinition.lobby(total: total)
        #expect(lobby.total == total)
    }

    @Test("Cue giver is absent in the lobby and present during play")
    func cueGiverPresence() {
        #expect(throws: RoundAlignmentError.cueGiverMismatch) {
            try RoundDefinition(
                index: 0,
                total: 6,
                phase: .lobby,
                cueGiverSeatId: "s1",
                turnSeatId: nil
            )
        }
        #expect(throws: RoundAlignmentError.cueGiverMismatch) {
            try RoundDefinition(
                index: 1,
                total: 6,
                phase: .secret1,
                cueGiverSeatId: nil,
                turnSeatId: nil
            )
        }
    }

    @Test("A turn seat exists only while guessing", arguments: GamePhase.allCases)
    func turnOnlyInGuess(phase: GamePhase) throws {
        let index = phase == .lobby ? 0 : 1
        let cue: String? = phase.isPlay ? "s1" : nil
        if phase.isGuess {
            #expect(throws: RoundAlignmentError.turnOutsideGuess) {
                try RoundDefinition(
                    index: index,
                    total: 6,
                    phase: phase,
                    cueGiverSeatId: cue,
                    turnSeatId: nil
                )
            }
            let round = try RoundDefinition(
                index: index,
                total: 6,
                phase: phase,
                cueGiverSeatId: cue,
                turnSeatId: "s2"
            )
            #expect(round.turnSeatId == "s2")
        } else {
            #expect(throws: RoundAlignmentError.turnOutsideGuess) {
                try RoundDefinition(
                    index: index,
                    total: 6,
                    phase: phase,
                    cueGiverSeatId: cue,
                    turnSeatId: "s2"
                )
            }
        }
    }

    @Test("Game over may be round zero, and the cue giver is cleared")
    func gameOverAllowsZero() throws {
        let endedEarly = try RoundDefinition(
            index: 0,
            total: 6,
            phase: .gameOver,
            cueGiverSeatId: nil,
            turnSeatId: nil
        )
        #expect(endedEarly.isGameOver)

        let finished = try RoundDefinition(
            index: 6,
            total: 6,
            phase: .gameOver,
            cueGiverSeatId: nil,
            turnSeatId: nil
        )
        #expect(finished.isLastRound)
        #expect(throws: RoundAlignmentError.cueGiverMismatch) {
            try RoundDefinition(
                index: 6,
                total: 6,
                phase: .gameOver,
                cueGiverSeatId: "s1",
                turnSeatId: nil
            )
        }
    }

    @Test("Golden view shapes from the shared fixtures align")
    func matchesFixtureRoundShapes() throws {
        let shapes: [RoundViewSnapshot] = [
            RoundViewSnapshot(phase: .lobby, round: 0, totalRounds: 6, cueGiverSeatId: nil, turnSeatId: nil),
            RoundViewSnapshot(phase: .secret1, round: 3, totalRounds: 6, cueGiverSeatId: "s1", turnSeatId: nil),
            RoundViewSnapshot(phase: .guess1, round: 3, totalRounds: 6, cueGiverSeatId: "s1", turnSeatId: "s2"),
            RoundViewSnapshot(phase: .reveal, round: 3, totalRounds: 6, cueGiverSeatId: "s1", turnSeatId: nil),
            RoundViewSnapshot(phase: .gameOver, round: 6, totalRounds: 6, cueGiverSeatId: nil, turnSeatId: nil),
        ]
        for shape in shapes {
            let round = try RoundDefinition(view: shape)
            #expect(round.index == shape.round)
            #expect(round.total == shape.totalRounds)
            #expect(round.phase == shape.phase)
            #expect(round.cueGiverSeatId == shape.cueGiverSeatId)
            #expect(round.turnSeatId == shape.turnSeatId)
        }
    }
}

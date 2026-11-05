import Testing
import TintCore

@Suite("Local game session")
struct LocalGameSessionTests {
    @Test("A local table stays on the local engine")
    func opensLocal() throws {
        let session = try LocalGameSession.open(humans: ["Ola", "Kuba"], agent: "Grok", seed: 1)
        #expect(session.backend == .local)
        #expect(session.session.engine is LocalGameEngine)
        #expect(session.hostSeatId == "s1")
        #expect(session.players.map(\.kind) == [.human, .human, .agent])
    }

    @Test("The agent takes a seat in the rotation")
    func agentRotatesWithHumans() throws {
        let session = try LocalGameSession.open(humans: ["Ola", "Kuba"], agent: "Grok", seed: 1)
        #expect(session.cueGiver(forRound: 1).id == "s1")
        #expect(session.cueGiver(forRound: 2).id == "s2")
        #expect(session.cueGiver(forRound: 3).kind == .agent)
        #expect(session.cueGiver(forRound: 4).id == "s1")
    }

    @Test("Two humans are enough, and the table stays between 2 and 6")
    func rosterBounds() throws {
        let pair = try LocalGameSession.open(humans: ["Ola", "Kuba"], seed: 1)
        #expect(pair.players.count == 2)

        #expect(throws: LocalSessionError.tooFewPlayers) {
            try LocalGameSession.open(humans: ["Ola"], seed: 1)
        }
        #expect(throws: LocalSessionError.tooManyPlayers) {
            try LocalGameSession.open(
                humans: ["A", "B", "C", "D", "E", "F"],
                agent: "Grok",
                seed: 1
            )
        }
        #expect(throws: LocalSessionError.alignment(.totalOutOfRange(0))) {
            try LocalGameSession.open(humans: ["Ola", "Kuba"], rounds: 0, seed: 1)
        }
    }

    @Test("Start deals round 1 to the host, and hides it from everyone else")
    func startHidesSecret() async throws {
        let session = try LocalGameSession.open(humans: ["Ola", "Kuba"], agent: "Grok", seed: 1)
        try await session.start()
        let round = try #require(await session.round)
        #expect(round.index == 1)
        #expect(round.phase == .secret1)
        #expect(round.cueGiverSeatId == "s1")

        let secret = await session.secretForHuman("s1")
        #expect(secret?.target == RoundSecret.Cell(x: 15, y: 0))
        #expect(secret?.window == RoundSecret.Window(x0: 12, y0: 0))
        #expect(await session.secretForHuman("s2") == nil)
        #expect(await session.secretForHuman("s3") == nil)
        #expect(await session.secretForAgent() == nil)
    }

    @Test("On the agent's round the phone cannot read the target")
    func agentRoundStaysPrivate() async throws {
        let round = try RoundDefinition(
            index: 3,
            total: 6,
            phase: .secret1,
            cueGiverSeatId: "s3",
            turnSeatId: nil
        )
        let session = try LocalGameSession.resume(
            at: round,
            humans: ["Ola", "Kuba"],
            agent: "Grok",
            seed: 1
        )
        #expect(session.backend == .local)
        let secret = await session.secretForAgent()
        #expect(secret?.target == RoundSecret.Cell(x: 23, y: 3))
        #expect(secret?.window == RoundSecret.Window(x0: 17, y0: 0))
        #expect(await session.secretForHuman("s1") == nil)
        #expect(await session.secretForHuman("s2") == nil)
    }

    @Test("The agent clues from the phone, and the shade stays off the humans")
    func agentClueUsesGrok() async throws {
        let round = try RoundDefinition(
            index: 3,
            total: 6,
            phase: .secret1,
            cueGiverSeatId: "s3",
            turnSeatId: nil
        )
        let session = try LocalGameSession.resume(
            at: round,
            humans: ["Ola", "Kuba"],
            agent: "Grok",
            seed: 1
        )
        let line = try await session.playAgent(using: ScriptedGrok())
        #expect(line == "Para znad garnka.")
        let after = try #require(await session.round)
        #expect(after.phase == .guess1)
        #expect(after.turnSeatId == "s1")
        #expect(await session.secretForHuman("s1") == nil)
        #expect(await session.clueTexts() == ["Rosół"])
    }
}

private struct ScriptedGrok: GrokLiveClient {
    func clueWord(secret: RoundSecret, phase: GamePhase, clues: [String]) async throws(GrokClientError) -> (word: String, line: String) {
        _ = (secret, phase, clues)
        return ("Rosół", "Para znad garnka.")
    }

    func guess(clues: [String], taken: [RoundSecret.Cell]) async throws(GrokClientError) -> GrokGuess {
        _ = (clues, taken)
        return GrokGuess(x: 4, y: 4, line: "Biorę środek stołu.")
    }

    func voiceTicket() async throws(GrokClientError) -> GrokVoiceTicket {
        throw .missingKey
    }
}

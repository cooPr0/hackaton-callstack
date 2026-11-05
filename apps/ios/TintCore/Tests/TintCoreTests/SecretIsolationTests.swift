import Testing
import TintCore

@Suite("Secret isolation")
struct SecretIsolationTests {
    @Test("The public round has no secret")
    func publicSnapshotHasNoSecret() throws {
        let round = try RoundDefinition(
            index: 1,
            total: 6,
            phase: .secret1,
            cueGiverSeatId: "s1",
            turnSeatId: nil
        )
        let mirror = Mirror(reflecting: round)
        let leaked = mirror.children.contains { label, value in
            label?.lowercased().contains("secret") == true || value is RoundSecret
        }
        #expect(leaked == false)
    }

    @Test("Before reveal, only the cue giver can read the target")
    func secretOnlyForCueGiver() async throws {
        let engine = try Support.engine()
        try await engine.send(.start(by: Support.host))
        let secret = await engine.secret(for: "s1")
        #expect(secret?.target == RoundSecret.Cell(x: 1, y: 1))
        #expect(await engine.secret(for: "s2") == nil)
    }

    @Test("Reveal and game over show the target to every seat", arguments: [GamePhase.reveal, GamePhase.gameOver])
    func secretForAllAtReveal(phase: GamePhase) async throws {
        let index = 2
        let cue: String? = phase == .reveal ? "s2" : nil
        let round = try RoundDefinition(
            index: index,
            total: 6,
            phase: phase,
            cueGiverSeatId: cue,
            turnSeatId: nil
        )
        let engine = LocalGameEngine(config: try Support.config(), resumingAt: round)
        for seat in ["s1", "s2", "s3"] {
            #expect(await engine.secret(for: seat) != nil)
        }
    }

    @Test("The lobby has no target")
    func noSecretInLobby() async throws {
        let engine = try Support.engine()
        #expect(await engine.secret(for: Support.host) == nil)
    }
}

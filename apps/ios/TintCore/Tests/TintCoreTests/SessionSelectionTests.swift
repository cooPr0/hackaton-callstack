import Testing
import TintCore

@Suite("Session selection")
struct SessionSelectionTests {
    @Test("The spec picks the driver", arguments: [true, false])
    func specPicksEngine(local: Bool) throws {
        let config = try Support.config()
        let transport = FakeTransport()
        let session = local
            ? GameSession(.local(config))
            : GameSession(.network(transport))

        #expect(session.backend == GameBackend(local: local))
        #expect(session.engine.backend == session.backend)
        if local {
            #expect(session.engine is LocalGameEngine)
        } else {
            #expect(session.engine is NetworkGameEngine)
        }
    }

    @Test("local: true stays on device even when a transport is available")
    func makeFromLocalFlag() throws {
        let config = try Support.config()
        let transport = FakeTransport()
        let session = try GameSession.make(local: true, config: config, transport: transport)
        #expect(session.backend == .local)
        #expect(session.engine is LocalGameEngine)

        #expect(throws: SessionError.missingTransport) {
            try GameSession.make(local: false, config: config, transport: nil)
        }
    }

    @Test("The backend does not change when the phase does")
    func backendStableAcrossPhases() async throws {
        let engine = try Support.engine()
        #expect(engine.backend == .local)
        try await engine.send(.start(by: Support.host))
        try await engine.send(.end(by: Support.host))
        #expect(engine.backend == .local)
        let round = try #require(await engine.round)
        #expect(round.isGameOver)
    }
}

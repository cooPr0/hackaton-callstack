import Testing
import TintCore

@Suite("Network engine")
struct NetworkEngineTests {
    @Test("Intents are forwarded and not applied locally")
    func forwardsIntentsVerbatim() async throws {
        let transport = FakeTransport()
        let engine = NetworkGameEngine(transport: transport)
        try await engine.send(.next(by: "s1"))
        try await engine.send(.pause(true, by: "s2"))
        let sent = await transport.sent
        #expect(sent == [.next(by: "s1"), .pause(true, by: "s2")])
        #expect(await engine.round == nil)
    }

    @Test("Round stays empty until the server sends one")
    func roundNilBeforeFirstUpdate() async {
        let engine = NetworkGameEngine(transport: FakeTransport())
        #expect(await engine.round == nil)
        #expect(await engine.lastSeq == 0)
        #expect(engine.backend == .network)
    }

    @Test("Stale sequence numbers are dropped")
    func dropsStaleSeq() async throws {
        let transport = FakeTransport()
        let engine = NetworkGameEngine(transport: transport)
        let first = try RoundDefinition.lobby(total: 6)
        let later = try RoundDefinition(
            index: 1,
            total: 6,
            phase: .secret1,
            cueGiverSeatId: "s1",
            turnSeatId: nil
        )
        await transport.push(RoundUpdate(seq: 3, round: first, paused: false))
        await transport.push(RoundUpdate(seq: 2, round: later, paused: true))
        await transport.push(RoundUpdate(seq: 3, round: later, paused: true))
        await transport.push(RoundUpdate(seq: 4, round: later, paused: false))
        await transport.finish()
        await engine.run()

        #expect(await engine.lastSeq == 4)
        #expect(await engine.round == later)
        #expect(await engine.isPaused == false)
    }

    @Test("A transport failure becomes a transport error")
    func transportErrorMaps() async {
        let transport = FakeTransport()
        await transport.failNextSend()
        let engine = NetworkGameEngine(transport: transport)
        let error = await #expect(throws: GameEngineError.self) {
            try await engine.send(.start(by: "s1"))
        }
        if let error, case .transport = error {
            return
        }
        if error != nil {
            Issue.record("expected .transport, got \(String(describing: error))")
        }
    }
}

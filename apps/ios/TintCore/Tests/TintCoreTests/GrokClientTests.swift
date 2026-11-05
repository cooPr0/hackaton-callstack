import Foundation
import Testing
import TintCore

@Suite("Grok client")
struct GrokClientTests {
    @Test("An empty key never leaves the phone")
    func missingKey() async {
        let client = XAIGrokClient(apiKey: "  ", transport: .live)
        await #expect(throws: GrokClientError.missingKey) {
            try await client.voiceTicket()
        }
    }

    @Test("The voice ticket is minted with the app key")
    func mintsVoiceTicket() async throws {
        let transport = XAITransport { request in
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer hackathon-key")
            #expect(request.url?.path == "/v1/realtime/client_secrets")
            let body = Data("{\"value\":\"xai-realtime-client-secret-test\",\"expires_at\":1700000000}".utf8)
            return (body, 200)
        }
        let ticket = try await XAIGrokClient(apiKey: "hackathon-key", transport: transport).voiceTicket()
        #expect(ticket.value == "xai-realtime-client-secret-test")
        #expect(ticket.expiresAt == 1_700_000_000)
        #expect(ticket.model == "grok-voice-latest")
        #expect(ticket.sessionUpdate.contains("Nie znasz sekretnego odcienia"))
        #expect(!ticket.sessionUpdate.contains("target"))
    }

    @Test("A color word is rejected and the retry is kept")
    func retriesColorWord() async throws {
        let counter = CallCounter()
        let secret = RoundSecret(target: RoundSecret.Cell(x: 15, y: 0), window: RoundSecret.Window(x0: 12, y0: 0))
        let transport = XAITransport { _ in
            let count = await counter.next()
            let word = count == 1 ? "niebieski" : "Rosół"
            let content = #"{"word":"\#(word)","line":"Para znad garnka."}"#
            let encoded = (try? JSONEncoder().encode(content)) ?? Data()
            let body = Data("""
            {"choices":[{"message":{"content":\(String(decoding: encoded, as: UTF8.self))}}]}
            """.utf8)
            return (body, 200)
        }
        let spoken = try await XAIGrokClient(apiKey: "hackathon-key", transport: transport)
            .clueWord(secret: secret, phase: .secret1, clues: [])
        #expect(spoken.word == "Rosół")
        #expect(await counter.total == 2)
    }
}

private actor CallCounter {
    private(set) var total = 0

    func next() -> Int {
        total += 1
        return total
    }
}

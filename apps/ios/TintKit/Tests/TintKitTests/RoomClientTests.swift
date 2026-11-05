import Foundation
import Testing
import TintKit

@Suite("Room client")
struct RoomClientTests {
    @Test("Hello is acknowledged and a stale view is dropped")
    func dropsStaleView() async throws {
        let connector = HeldConnector()
        let client = RoomClient(
            url: URL(string: "ws://127.0.0.1/api/rooms/K7PQX/ws?token=abc&pv=1")!,
            name: "Ola",
            connector: connector,
            pingInterval: .seconds(3600),
            ackTimeout: .seconds(2),
            maxAttempts: 1,
            random: { 0.5 }
        )
        let box = MessageBox()
        let collect = Task {
            for await message in client.messages {
                box.add(message)
            }
        }

        let connecting = Task { try await client.connect() }
        let hello = try await waitUntilSent(connector)
        let sent = try JSONDecoder().decode(ClientMessage.self, from: Data(hello.utf8))
        guard case .hello(let cid, .ios, "Ola") = sent else {
            Issue.record("expected an iOS hello")
            return
        }
        connector.pipe.push(#"{"type":"welcome","seatIds":["s2"],"serverTime":1,"protocol":1}"#)
        connector.pipe.push(#"{"type":"ack","cid":"\#(cid)"}"#)
        try await connecting.value

        let view = try String(contentsOf: fixturesRoot().appending(path: "messages/server.view.json"), encoding: .utf8)
        connector.pipe.push(view.replacingOccurrences(of: "\"seq\": 42", with: "\"seq\": 1"))
        connector.pipe.push(view.replacingOccurrences(of: "\"seq\": 42", with: "\"seq\": 1"))
        connector.pipe.push(view.replacingOccurrences(of: "\"seq\": 42", with: "\"seq\": 2"))
        try await waitUntil(box, count: 3)

        let messages = box.snapshot()
        #expect(messages.count == 3)
        guard case .welcome = messages[0] else {
            Issue.record("missing welcome")
            return
        }
        guard case .view(let first, _) = messages[1], case .view(let second, _) = messages[2] else {
            Issue.record("missing views")
            return
        }
        #expect(first == 1)
        #expect(second == 2)

        await client.close()
        await collect.value
    }

    @Test("A bad token does not reconnect")
    func fatalClose() async throws {
        let connector = HeldConnector()
        let client = RoomClient(
            url: URL(string: "ws://127.0.0.1/api/rooms/K7PQX/ws?token=nope&pv=1")!,
            name: nil,
            connector: connector,
            pingInterval: .seconds(3600),
            ackTimeout: .seconds(2),
            maxAttempts: 3,
            random: { 0.5 }
        )
        let connecting = Task { try await client.connect() }
        _ = try await waitUntilSent(connector)
        connector.pipe.fail(code: 4401)
        await #expect(throws: RoomError.fatalClose(4401)) {
            try await connecting.value
        }
        #expect(connector.opens == 1)
    }
}

@Suite("HTTP client")
struct APIClientTests {
    @Test("Health and a room error use the protocol bodies")
    func healthAndError() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubProtocol.self]
        let session = URLSession(configuration: configuration)
        let client = APIClient(config: ServerConfig(baseURL: URL(string: "https://example.test")!), session: session)

        StubProtocol.handler = { request in
            #expect(request.url?.path == "/api/health")
            return (200, Data(#"{"ok":true,"version":"0.1.0","protocol":1}"#.utf8))
        }
        let health = try await client.health()
        #expect(health.protocolVersion == 1)

        StubProtocol.handler = { _ in
            (404, Data(#"{"code":"ROOM_NOT_FOUND","message":"no such room"}"#.utf8))
        }
        await #expect(throws: APIError.server(code: .roomNotFound, message: "no such room", status: 404)) {
            try await client.join(code: "ZZZZZ", name: "Ola")
        }
    }
}

@Suite("Keychain tokens")
struct TokenStoreTests {
    @Test("Tokens for a room survive a rewrite")
    func roundTrip() throws {
        let store = KeychainTokenStore(service: "com.tintandtell.test.\(UUID().uuidString)")
        try store.save(code: "K7PQX", tokens: ["one", "two"])
        #expect(try store.load(code: "K7PQX") == ["one", "two"])
        try store.save(code: "K7PQX", tokens: ["three"])
        #expect(try store.load(code: "K7PQX") == ["three"])
        try store.delete(code: "K7PQX")
        #expect(try store.load(code: "K7PQX") == nil)
    }
}

private final class PipeSocket: WebSocketChannel, @unchecked Sendable {
    private let lock = NSLock()
    private var sent: [String] = []
    private var buffer: [String] = []
    private var waiters: [CheckedContinuation<String, any Error>] = []
    private var failed = false
    private var code = 0

    var closeCode: Int {
        lock.lock()
        defer { lock.unlock() }
        return code
    }

    func sentSnapshot() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return sent
    }

    func push(_ text: String) {
        lock.lock()
        if !waiters.isEmpty {
            let waiter = waiters.removeFirst()
            lock.unlock()
            waiter.resume(returning: text)
        } else {
            buffer.append(text)
            lock.unlock()
        }
    }

    func fail(code: Int) {
        lock.lock()
        self.code = code
        failed = true
        let pending = waiters
        waiters.removeAll()
        lock.unlock()
        for waiter in pending {
            waiter.resume(throwing: URLError(.networkConnectionLost))
        }
    }

    func send(text: String) async throws {
        record(text)
    }

    private func record(_ text: String) {
        lock.lock()
        sent.append(text)
        lock.unlock()
    }

    func receiveText() async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            lock.lock()
            if failed {
                lock.unlock()
                continuation.resume(throwing: URLError(.networkConnectionLost))
                return
            }
            if !buffer.isEmpty {
                let text = buffer.removeFirst()
                lock.unlock()
                continuation.resume(returning: text)
                return
            }
            waiters.append(continuation)
            lock.unlock()
        }
    }

    func close() {
        fail(code: 1000)
    }
}

private final class HeldConnector: WebSocketConnecting, @unchecked Sendable {
    let pipe = PipeSocket()
    private let lock = NSLock()
    private var opened = 0

    var opens: Int {
        lock.lock()
        defer { lock.unlock() }
        return opened
    }

    func open(url: URL) async throws -> any WebSocketChannel {
        countOpen()
        return pipe
    }

    private func countOpen() {
        lock.lock()
        opened += 1
        lock.unlock()
    }
}

private final class MessageBox: @unchecked Sendable {
    private let lock = NSLock()
    private var messages: [ServerMessage] = []

    func add(_ message: ServerMessage) {
        lock.lock()
        messages.append(message)
        lock.unlock()
    }

    func snapshot() -> [ServerMessage] {
        lock.lock()
        defer { lock.unlock() }
        return messages
    }
}

private func waitUntilSent(_ connector: HeldConnector) async throws -> String {
    for _ in 0..<50 {
        if let first = connector.pipe.sentSnapshot().first { return first }
        try await Task.sleep(for: .milliseconds(20))
    }
    Issue.record("hello was not sent")
    throw FixtureMissing.timeout
}

private func waitUntil(_ box: MessageBox, count: Int) async throws {
    for _ in 0..<50 {
        if box.snapshot().count >= count { return }
        try await Task.sleep(for: .milliseconds(20))
    }
    Issue.record("expected \(count) messages, saw \(box.snapshot().count)")
    throw FixtureMissing.timeout
}

private func fixturesRoot(file: String = #filePath) throws -> URL {
    var url = URL(fileURLWithPath: file).deletingLastPathComponent()
    while url.path != "/" {
        let candidate = url.appending(path: "shared/fixtures")
        if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        url.deleteLastPathComponent()
    }
    throw FixtureMissing.timeout
}

private enum FixtureMissing: Error { case timeout }

private final class StubProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var handler: (@Sendable (URLRequest) -> (Int, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler, let url = request.url else { return }
        let (status, data) = handler(request)
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

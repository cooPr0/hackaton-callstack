import Foundation

public enum RoomError: Error, Sendable, Equatable {
    case timeout
    case closed
    case rejected(ErrorCode, String)
    case fatalClose(Int)
    case attemptsExhausted
    case binaryFrame
}

/// One socket to a room. Sends `hello` on every connect, waits for `ack`, drops stale views,
/// pings, and reconnects. `4401`, `4404`, `4409`, and `4426` do not reconnect.
public actor RoomClient {
    public nonisolated let messages: AsyncStream<ServerMessage>

    public static let fatalCloseCodes: Set<Int> = [4401, 4404, 4409, 4426]

    private let url: URL
    private let name: String?
    private let connector: any WebSocketConnecting
    private let pingInterval: Duration
    private let ackTimeout: Duration
    private let maxAttempts: Int
    private let random: @Sendable () -> Double
    private let newCid: @Sendable () -> String
    private let messagesContinuation: AsyncStream<ServerMessage>.Continuation

    private var channel: (any WebSocketChannel)?
    private var generation = 0
    private var lastSeq = -1
    private var closed = false
    private var loop: Task<Void, Never>?
    private var pumpTask: Task<Void, Never>?
    private var pingTask: Task<Void, Never>?
    private var ready: CheckedContinuation<Void, any Error>?
    private var socketEnded: CheckedContinuation<Void, Never>?
    private var socketFinished = false
    private var pending: [String: CheckedContinuation<Void, any Error>] = [:]
    private var openedOnce = false
    private var stop = false

    public init(
        url: URL,
        name: String?,
        connector: any WebSocketConnecting = URLSessionWebSocketConnector(),
        pingInterval: Duration = ProtocolConstant.pingInterval,
        ackTimeout: Duration = ProtocolConstant.ackTimeout,
        maxAttempts: Int = 10,
        random: @escaping @Sendable () -> Double = { Double.random(in: 0...1) },
        newCid: @escaping @Sendable () -> String = { UUID().uuidString }
    ) {
        self.url = url
        self.name = name
        self.connector = connector
        self.pingInterval = pingInterval
        self.ackTimeout = ackTimeout
        self.maxAttempts = maxAttempts
        self.random = random
        self.newCid = newCid
        let (stream, continuation) = AsyncStream<ServerMessage>.makeStream()
        messages = stream
        messagesContinuation = continuation
    }

    /// Opens the socket and returns after `hello` is acknowledged. Later drops reconnect on their own.
    public func connect() async throws {
        if openedOnce { return }
        loop = Task { await self.run() }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            ready = continuation
        }
    }

    public func close() {
        closed = true
        channel?.close()
        failAll(.closed)
        pingTask?.cancel()
        pumpTask?.cancel()
        loop?.cancel()
        if let ready {
            self.ready = nil
            ready.resume(throwing: RoomError.closed)
        }
        if let socketEnded {
            self.socketEnded = nil
            socketEnded.resume()
        }
        messagesContinuation.finish()
    }

    public func startGame() async throws {
        try await send(.gameStart(cid: ""), waitForAck: true)
    }

    public func submitClue(seatId: String, text: String) async throws {
        try await send(.clueSubmit(cid: "", seatId: seatId, text: text), waitForAck: true)
    }

    public func placeStone(seatId: String, x: Int, y: Int) async throws {
        try await send(.stonePlace(cid: "", seatId: seatId, x: x, y: y), waitForAck: true)
    }

    public func nextRound() async throws {
        try await send(.roundNext(cid: ""), waitForAck: true)
    }

    public func setPaused(_ paused: Bool) async throws {
        try await send(.pauseSet(cid: "", paused: paused), waitForAck: true)
    }

    public func endGame() async throws {
        try await send(.gameEnd(cid: ""), waitForAck: true)
    }

    /// Backoff for the n-th failed attempt, starting at 1: 0.5s, 1s, 2s, 4s, then 8s, ±20%.
    public static func backoff(attempt: Int, random: Double) -> Duration {
        let power = Double(max(0, attempt - 1))
        let base = min(8.0, 0.5 * pow(2, power))
        let jitter = 0.8 + 0.4 * min(1, max(0, random))
        return .milliseconds(Int((base * jitter * 1000).rounded()))
    }

    private func run() async {
        var attempt = 0
        while !closed {
            do {
                try await openAndHello()
                openedOnce = true
                attempt = 0
                if let ready {
                    self.ready = nil
                    ready.resume()
                }
                await waitForSocketEnd()
                if closed || stop { break }
            } catch {
                failAll(.closed)
                channel?.close()
                if closed { break }
                if let room = error as? RoomError, case .fatalClose = room {
                    failReady(room)
                    break
                }
                attempt += 1
                if attempt > maxAttempts {
                    failReady(.attemptsExhausted)
                    break
                }
                try? await Task.sleep(for: Self.backoff(attempt: attempt, random: random()))
                continue
            }
            attempt += 1
            if attempt > maxAttempts { break }
            try? await Task.sleep(for: Self.backoff(attempt: attempt, random: random()))
        }
        failReady(RoomError.attemptsExhausted)
    }

    private func openAndHello() async throws {
        let socket = try await connector.open(url: url)
        generation += 1
        let generation = generation
        channel?.close()
        channel = socket
        socketFinished = false
        pumpTask = Task { await self.pump(socket, generation: generation) }
        pingTask?.cancel()
        pingTask = Task { await self.ping() }
        do {
            let hello = ClientMessage.hello(cid: newCid(), platform: .ios, name: name)
            try await send(hello, waitForAck: true)
        } catch {
            if self.generation == generation {
                socket.close()
            }
            throw error
        }
    }

    private func pump(_ socket: any WebSocketChannel, generation: Int) async {
        defer {
            if self.generation == generation {
                if let socketEnded {
                    self.socketEnded = nil
                    socketEnded.resume()
                } else {
                    socketFinished = true
                }
            }
        }
        do {
            while !closed && self.generation == generation && !Task.isCancelled {
                let text = try await socket.receiveText()
                guard self.generation == generation else { return }
                handle(text)
            }
        } catch {
            guard self.generation == generation, !closed, !Task.isCancelled else { return }
            let code = socket.closeCode
            if Self.fatalCloseCodes.contains(code) {
                stop = true
                failAll(.fatalClose(code))
            } else {
                failAll(.closed)
            }
        }
    }

    private func waitForSocketEnd() async {
        if socketFinished {
            socketFinished = false
            return
        }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            socketEnded = continuation
        }
    }

    private func ping() async {
        while !closed && !Task.isCancelled {
            try? await Task.sleep(for: pingInterval)
            guard !closed, !Task.isCancelled else { return }
            var ping = ClientMessage.ping(cid: "")
            ping = ping.replacingCid(newCid())
            try? await send(ping, waitForAck: false)
        }
    }

    private func send(_ message: ClientMessage, waitForAck: Bool) async throws {
        let message = message.cid.isEmpty ? message.replacingCid(newCid()) : message
        let data = try JSONEncoder().encode(message)
        guard let text = String(data: data, encoding: .utf8) else { throw RoomError.closed }
        guard let channel else { throw RoomError.closed }
        if !waitForAck {
            try await channel.send(text: text)
            return
        }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            pending[message.cid] = continuation
            Task {
                do {
                    try await channel.send(text: text)
                } catch {
                    self.settle(message.cid, throwing: error)
                }
            }
            Task {
                try? await Task.sleep(for: self.ackTimeout)
                self.settle(message.cid, throwing: RoomError.timeout)
            }
        }
    }

    private func handle(_ text: String) {
        guard let data = text.data(using: .utf8), let message = ServerMessage.decode(data) else { return }
        switch message {
        case .welcome:
            lastSeq = -1
            messagesContinuation.yield(message)
        case .view(let seq, _):
            guard seq > lastSeq else { return }
            lastSeq = seq
            messagesContinuation.yield(message)
        case .ack(let cid):
            settle(cid, throwing: nil)
        case .error(let cid, let code, let text):
            if let cid, pending[cid] != nil {
                settle(cid, throwing: RoomError.rejected(code, text))
            } else {
                messagesContinuation.yield(message)
            }
        case .pong:
            break
        case .botStatus, .botSay, .grokHint, .voiceReady:
            messagesContinuation.yield(message)
        }
    }

    private func settle(_ cid: String, throwing error: (any Error)?) {
        guard let continuation = pending.removeValue(forKey: cid) else { return }
        if let error {
            continuation.resume(throwing: error)
        } else {
            continuation.resume()
        }
    }

    private func failAll(_ error: RoomError) {
        let waiting = pending
        pending.removeAll()
        for continuation in waiting.values {
            continuation.resume(throwing: error)
        }
    }

    private func failReady(_ error: RoomError) {
        guard let ready else { return }
        self.ready = nil
        ready.resume(throwing: error)
    }
}

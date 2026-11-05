import Foundation

public protocol WebSocketChannel: Sendable {
    func send(text: String) async throws
    func receiveText() async throws -> String
    func close()
    var closeCode: Int { get }
}

public protocol WebSocketConnecting: Sendable {
    func open(url: URL) async throws -> any WebSocketChannel
}

public struct URLSessionWebSocketConnector: WebSocketConnecting {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func open(url: URL) async throws -> any WebSocketChannel {
        let task = session.webSocketTask(with: url)
        task.resume()
        return URLSessionChannel(task: task)
    }
}

final class URLSessionChannel: WebSocketChannel, @unchecked Sendable {
    private let task: URLSessionWebSocketTask

    init(task: URLSessionWebSocketTask) {
        self.task = task
    }

    func send(text: String) async throws {
        try await task.send(.string(text))
    }

    func receiveText() async throws -> String {
        switch try await task.receive() {
        case .string(let text):
            return text
        case .data:
            throw RoomError.binaryFrame
        @unknown default:
            throw RoomError.binaryFrame
        }
    }

    func close() {
        task.cancel(with: .normalClosure, reason: nil)
    }

    var closeCode: Int { task.closeCode.rawValue }
}

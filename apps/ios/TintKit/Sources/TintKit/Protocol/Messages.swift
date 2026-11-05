import Foundation

public enum ClientMessage: Codable, Sendable, Equatable {
    case hello(cid: String, platform: Platform, name: String?)
    case gameStart(cid: String)
    case clueSubmit(cid: String, seatId: String, text: String)
    case stonePlace(cid: String, seatId: String, x: Int, y: Int)
    case roundNext(cid: String)
    case pauseSet(cid: String, paused: Bool)
    case gameEnd(cid: String)
    case ping(cid: String)
    case grokAsk(cid: String, seatId: String, draft: String?)
    case voiceTicket(cid: String, seatId: String)

    public func replacingCid(_ cid: String) -> ClientMessage {
        switch self {
        case .hello(_, let platform, let name): .hello(cid: cid, platform: platform, name: name)
        case .gameStart: .gameStart(cid: cid)
        case .clueSubmit(_, let seatId, let text): .clueSubmit(cid: cid, seatId: seatId, text: text)
        case .stonePlace(_, let seatId, let x, let y): .stonePlace(cid: cid, seatId: seatId, x: x, y: y)
        case .roundNext: .roundNext(cid: cid)
        case .pauseSet(_, let paused): .pauseSet(cid: cid, paused: paused)
        case .gameEnd: .gameEnd(cid: cid)
        case .ping: .ping(cid: cid)
        case .grokAsk(_, let seatId, let draft): .grokAsk(cid: cid, seatId: seatId, draft: draft)
        case .voiceTicket(_, let seatId): .voiceTicket(cid: cid, seatId: seatId)
        }
    }

    var cid: String {
        switch self {
        case .hello(let cid, _, _),
             .gameStart(let cid),
             .clueSubmit(let cid, _, _),
             .stonePlace(let cid, _, _, _),
             .roundNext(let cid),
             .pauseSet(let cid, _),
             .gameEnd(let cid),
             .ping(let cid),
             .grokAsk(let cid, _, _),
             .voiceTicket(let cid, _):
            cid
        }
    }
}

public enum BotState: String, Codable, Sendable, Equatable {
    case thinking, idle
}

public enum ServerMessage: Codable, Sendable, Equatable {
    case welcome(seatIds: [String], serverTime: Int, protocolVersion: Int)
    case view(seq: Int, view: PlayerView)
    case botStatus(seatId: String, state: BotState)
    case botSay(seatId: String, text: String, audioUrl: String?)
    case grokHint(seatId: String, text: String, citations: [Citation])
    case voiceReady(VoiceReady)
    case ack(cid: String)
    case error(cid: String?, code: ErrorCode, message: String)
    case pong

    /// Known frames decode. Unknown types and malformed frames become `nil` and are dropped.
    public static func decode(_ data: Data) -> ServerMessage? {
        guard let type = frameType(data), knownTypes.contains(type) else { return nil }
        return try? JSONDecoder().decode(ServerMessage.self, from: data)
    }

    private static let knownTypes: Set<String> = [
        "welcome", "view", "bot.status", "bot.say", "grok.hint", "voice.ready", "ack", "error", "pong",
    ]

    private static func frameType(_ data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return object["type"] as? String
    }
}

public struct CreateRoomRequest: Codable, Sendable, Equatable {
    public var mode: Mode
    public var rounds: Int
    public var local: Bool
    public var platform: Platform
    public var seats: [RequestedSeat]
    public var botMode: BotMode
    public var lang: Lang

    public struct RequestedSeat: Codable, Sendable, Equatable {
        public var name: String
        public var kind: SeatKind

        public init(name: String, kind: SeatKind) {
            self.name = name
            self.kind = kind
        }
    }

    public init(
        mode: Mode,
        rounds: Int = 6,
        local: Bool,
        platform: Platform = .ios,
        seats: [RequestedSeat],
        botMode: BotMode = .grok,
        lang: Lang = .pl
    ) {
        self.mode = mode
        self.rounds = rounds
        self.local = local
        self.platform = platform
        self.seats = seats
        self.botMode = botMode
        self.lang = lang
    }
}

public struct SeatCredential: Codable, Sendable, Equatable {
    public var seatId: String
    public var token: String
}

public struct CreateRoomResponse: Codable, Sendable, Equatable {
    public var code: String
    public var seats: [SeatCredential]
}

public struct JoinRoomRequest: Codable, Sendable, Equatable {
    public var name: String
    public var platform: Platform

    public init(name: String, platform: Platform = .ios) {
        self.name = name
        self.platform = platform
    }
}

public struct HealthResponse: Codable, Sendable, Equatable {
    public var ok: Bool
    public var version: String
    public var protocolVersion: Int

    enum CodingKeys: String, CodingKey {
        case ok, version
        case protocolVersion = "protocol"
    }
}

public struct HTTPErrorBody: Codable, Sendable, Equatable {
    public var code: String
    public var message: String
}

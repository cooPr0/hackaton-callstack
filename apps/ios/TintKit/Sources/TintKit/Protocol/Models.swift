public struct Cell: Codable, Sendable, Equatable {
    public var x: Int
    public var y: Int

    public init(x: Int, y: Int) {
        self.x = x
        self.y = y
    }
}

public struct Stone: Codable, Sendable, Equatable {
    public var seatId: String
    public var x: Int
    public var y: Int
    /// 1 in the first guess, 2 in the second.
    public var n: Int

    public init(seatId: String, x: Int, y: Int, n: Int) {
        self.seatId = seatId
        self.x = x
        self.y = y
        self.n = n
    }
}

public struct SeatView: Codable, Sendable, Equatable {
    public var id: String
    public var name: String
    public var kind: SeatKind
    public var platform: Platform?
    public var score: Int
    public var connected: Bool
    public var degraded: Bool?
}

public struct ViewfinderWindow: Codable, Sendable, Equatable {
    public var x0: Int
    public var y0: Int
    public var w: Int
    public var h: Int
}

public struct Secret: Codable, Sendable, Equatable {
    public var target: Cell
    public var window: ViewfinderWindow
}

public struct Award: Codable, Sendable, Equatable {
    public var seatId: String
    public var delta: Int
    public var reason: Reason

    public enum Reason: String, Codable, Sendable, Equatable {
        case exact, near, far, house
    }
}

public struct Reveal: Codable, Sendable, Equatable {
    public var target: Cell
    public var awards: [Award]
    public var botLine: String?
}

public struct HistoryEntry: Codable, Sendable, Equatable {
    public var round: Int
    public var cueGiverSeatId: String
    public var target: Cell
    public var clues: [String]
}

public struct PlayerView: Codable, Sendable, Equatable {
    public var v: Int
    public var roomCode: String
    public var mode: Mode
    public var local: Bool
    /// Absent on a v1 server. Treat that as Polish.
    public var lang: Lang?
    public var phase: Phase
    public var round: Int
    public var totalRounds: Int
    public var paused: Bool
    public var hostSeatId: String
    public var seats: [SeatView]
    public var you: [String]
    public var cueGiverSeatId: String?
    public var turnSeatId: String?
    public var turnDeadline: Int?
    public var clues: [String]
    public var stones: [Stone]
    public var secret: Secret?
    public var reveal: Reveal?
    public var history: [HistoryEntry]

    public var language: Lang { lang ?? .pl }
}

public struct Citation: Codable, Sendable, Equatable {
    public var handle: String
    public var url: String
}

public enum JSONValue: Codable, Sendable, Equatable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode(Int.self) {
            self = .number(Double(value))
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "unsupported JSON")
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

public struct VoiceReady: Codable, Sendable, Equatable {
    public var seatId: String
    public var value: String
    public var expiresAt: Int
    public var url: String
    public var model: String
    public var voice: String
    public var session: Session

    public struct Session: Codable, Sendable, Equatable {
        public var type: String
        public var session: [String: JSONValue]
    }
}

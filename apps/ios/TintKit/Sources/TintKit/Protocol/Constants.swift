public enum Mode: String, Codable, Sendable, Equatable, CaseIterable {
    case stol, ty, grok
}

public enum Phase: String, Codable, Sendable, Equatable, CaseIterable {
    case lobby = "LOBBY"
    case secret1 = "SECRET_1"
    case guess1 = "GUESS_1"
    case secret2 = "SECRET_2"
    case guess2 = "GUESS_2"
    case reveal = "REVEAL"
    case gameOver = "GAME_OVER"
}

public enum SeatKind: String, Codable, Sendable, Equatable {
    case human, grok
}

public enum Platform: String, Codable, Sendable, Equatable {
    case ios, web, bot
}

public enum Lang: String, Codable, Sendable, Equatable {
    case pl, en
}

public enum BotMode: String, Codable, Sendable, Equatable {
    case grok, fallback
}

public enum ErrorCode: String, Codable, Sendable, Equatable {
    case protocolMismatch = "PROTOCOL_MISMATCH"
    case badRequest = "BAD_REQUEST"
    case badToken = "BAD_TOKEN"
    case notYourTurn = "NOT_YOUR_TURN"
    case notYourSeat = "NOT_YOUR_SEAT"
    case cellTaken = "CELL_TAKEN"
    case invalidClue = "INVALID_CLUE"
    case colorWord = "COLOR_WORD"
    case wrongPhase = "WRONG_PHASE"
    case paused = "PAUSED"
    case rateLimited = "RATE_LIMITED"
    case roomFull = "ROOM_FULL"
    case roomNotFound = "ROOM_NOT_FOUND"
    case `internal` = "INTERNAL"
}

public enum ProtocolConstant {
    public static let version = 1
    public static let boardColumns = 24
    public static let boardRows = 12
    public static let hingeAfterColumn = 11
    public static let pingInterval: Duration = .seconds(20)
    public static let ackTimeout: Duration = .seconds(5)
}

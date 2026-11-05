/// Engine intents. They match `game-core` `Action` and carry no wire `cid`.
public enum GameIntent: Sendable, Equatable {
    public enum SkipReason: String, Sendable, Equatable {
        case timeout
        case disconnected
    }

    case start(by: String)
    case clue(seatId: String, text: String)
    case stone(seatId: String, x: Int, y: Int)
    case skip(seatId: String, reason: SkipReason)
    case next(by: String)
    case pause(Bool, by: String)
    case end(by: String)
}

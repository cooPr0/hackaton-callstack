/// Phase names match `packages/protocol` (`PHASES`). Raw values are the wire strings.
public enum GamePhase: String, Sendable, Equatable, Codable, CaseIterable {
    case lobby = "LOBBY"
    case secret1 = "SECRET_1"
    case guess1 = "GUESS_1"
    case secret2 = "SECRET_2"
    case guess2 = "GUESS_2"
    case reveal = "REVEAL"
    case gameOver = "GAME_OVER"

    /// Stones are placed only in the two guess phases.
    public var isGuess: Bool {
        self == .guess1 || self == .guess2
    }

    /// REVEAL shows the target to every seat on the wire.
    /// GAME_OVER views omit `secret`; past targets live in `PlayerView.history`.
    /// The local engine still returns its stored target at game over, because it has no history.
    public var revealsSecretToAll: Bool {
        self == .reveal || self == .gameOver
    }

    /// A round is being played: secret, guess, or reveal. Lobby and game over are not.
    public var isPlay: Bool {
        switch self {
        case .secret1, .guess1, .secret2, .guess2, .reveal:
            true
        case .lobby, .gameOver:
            false
        }
    }
}

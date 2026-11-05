public enum SessionSpec: Sendable {
    case local(LocalGameConfig)
    case network(any GameTransport)
}

public enum SessionError: Error, Sendable, Equatable {
    /// Online play was requested and no transport was provided.
    case missingTransport
}

/// Picks the driver once. `local: true` is pass-and-play on this device. `local: false` is the server.
public struct GameSession: Sendable {
    public let backend: GameBackend
    public let engine: any GameEngine

    public init(_ spec: SessionSpec) {
        switch spec {
        case .local(let config):
            self.init(local: LocalGameEngine(config: config))
        case .network(let transport):
            self.init(network: NetworkGameEngine(transport: transport))
        }
    }

    /// Wraps an engine that is already in a round. A new `.local` spec always starts in the lobby.
    public init(local engine: LocalGameEngine) {
        backend = .local
        self.engine = engine
    }

    public init(network engine: NetworkGameEngine) {
        backend = .network
        self.engine = engine
    }

    public static func make(
        local: Bool,
        config: LocalGameConfig,
        transport: (any GameTransport)?
    ) throws(SessionError) -> GameSession {
        if local {
            return GameSession(.local(config))
        }
        guard let transport else { throw .missingTransport }
        return GameSession(.network(transport))
    }
}

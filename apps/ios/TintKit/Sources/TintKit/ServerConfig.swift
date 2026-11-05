import Foundation

/// Where the phone finds the room server. Production is the default.
/// A debug build can override it with the UserDefaults key `tint.apiBase`.
public struct ServerConfig: Sendable, Equatable {
    public var baseURL: URL

    public static let overrideKey = "tint.apiBase"
    public static let production = ServerConfig(
        baseURL: URL(string: "https://tint-server.tint-server.workers.dev")!
    )
    public static let local = ServerConfig(baseURL: URL(string: "http://localhost:8787")!)

    public init(baseURL: URL) {
        self.baseURL = baseURL
    }

    public static func resolved(defaults: UserDefaults = .standard) -> ServerConfig {
        #if DEBUG
        if let raw = defaults.string(forKey: overrideKey),
           let url = URL(string: raw),
           url.scheme == "http" || url.scheme == "https"
        {
            return ServerConfig(baseURL: url)
        }
        #endif
        return .production
    }

    /// `wss` (or `ws`) URL for one room. Repeat every token this socket controls.
    public func webSocketURL(code: String, tokens: [String]) -> URL? {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { return nil }
        switch components.scheme {
        case "https": components.scheme = "wss"
        case "http": components.scheme = "ws"
        default: break
        }
        components.path = "/api/rooms/\(code)/ws"
        var items = tokens.map { URLQueryItem(name: "token", value: $0) }
        items.append(URLQueryItem(name: "pv", value: String(ProtocolConstant.version)))
        components.queryItems = items
        return components.url
    }

    func endpoint(_ path: String) -> URL? {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else { return nil }
        components.path = path
        return components.url
    }
}

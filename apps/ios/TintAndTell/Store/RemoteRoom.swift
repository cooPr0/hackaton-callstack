import Foundation
import TintKit

/// The phone's door to the game server. Production unless a debug override is set.
enum RemoteRoom {
    static var api: APIClient { APIClient(config: .resolved()) }

    static func client(code: String, tokens: [String], name: String?) -> RoomClient? {
        guard let url = ServerConfig.resolved().webSocketURL(code: code, tokens: tokens) else { return nil }
        return RoomClient(url: url, name: name)
    }
}

import Foundation

public enum APIError: Error, Sendable, Equatable {
    case network
    case server(code: ErrorCode, message: String, status: Int)
    case badResponse(status: Int)
}

/// HTTP create, join, and health. The socket is `RoomClient`.
public struct APIClient: Sendable {
    public var config: ServerConfig
    private let session: URLSession

    public init(config: ServerConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    public func health() async throws -> HealthResponse {
        try await request(path: "/api/health", method: "GET", body: Optional<String>.none)
    }

    public func createRoom(_ requestBody: CreateRoomRequest) async throws -> CreateRoomResponse {
        try await request(path: "/api/rooms", method: "POST", body: requestBody)
    }

    public func join(code: String, name: String, platform: Platform = .ios) async throws -> SeatCredential {
        let path = "/api/rooms/\(code)/join"
        return try await request(path: path, method: "POST", body: JoinRoomRequest(name: name, platform: platform))
    }

    private func request<Response: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body?
    ) async throws -> Response {
        guard let url = config.endpoint(path) else { throw APIError.badResponse(status: 0) }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = method
        urlRequest.timeoutInterval = 8
        if let body {
            urlRequest.setValue("application/json", forHTTPHeaderField: "content-type")
            urlRequest.httpBody = try JSONEncoder().encode(body)
        }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw APIError.network
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if let http = try? JSONDecoder().decode(HTTPErrorBody.self, from: data),
               let code = ErrorCode(rawValue: http.code)
            {
                throw APIError.server(code: code, message: http.message, status: status)
            }
            throw APIError.badResponse(status: status)
        }
        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw APIError.badResponse(status: status)
        }
    }
}

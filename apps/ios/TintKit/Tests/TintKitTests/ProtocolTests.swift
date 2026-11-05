import Foundation
import Testing
import TintKit

@Suite("Protocol fixtures")
struct ProtocolTests {
    @Test("Client fixtures round-trip")
    func clientFixtures() throws {
        for url in try fixtureURLs(prefix: "client.") {
            let original = try Data(contentsOf: url)
            let message = try JSONDecoder().decode(ClientMessage.self, from: original)
            let encoded = try JSONEncoder().encode(message)
            #expect(jsonEqual(original, encoded), "\(url.lastPathComponent) drifted")
        }
    }

    @Test("Server fixtures round-trip")
    func serverFixtures() throws {
        for url in try fixtureURLs(prefix: "server.") {
            let original = try Data(contentsOf: url)
            let message = try #require(ServerMessage.decode(original))
            let encoded = try JSONEncoder().encode(message)
            let again = try #require(ServerMessage.decode(encoded))
            #expect(message == again, "\(url.lastPathComponent) drifted")
        }
    }

    @Test("Guess view keeps the secret off this socket")
    func guessViewOmitsSecret() throws {
        let url = try fixturesRoot().appending(path: "messages/server.view.json")
        let message = try #require(ServerMessage.decode(Data(contentsOf: url)))
        guard case .view(let seq, let view) = message else {
            Issue.record("expected a view")
            return
        }
        #expect(seq == 42)
        #expect(view.phase == .guess1)
        #expect(view.secret == nil)
        #expect(view.language == .pl)
        #expect(view.stones.count == 1)
    }

    @Test("Unknown server frames are dropped")
    func dropsUnknown() {
        let data = Data(#"{"type":"future.thing","cid":"c"}"#.utf8)
        #expect(ServerMessage.decode(data) == nil)
    }

    @Test("HTTP fixtures decode")
    func httpFixtures() throws {
        let root = try fixturesRoot().appending(path: "messages")
        let create = try Data(contentsOf: root.appending(path: "http.create-room.request.json"))
        #expect(try JSONDecoder().decode(CreateRoomRequest.self, from: create).seats.count == 3)
        let created = try Data(contentsOf: root.appending(path: "http.create-room.response.json"))
        #expect(try JSONDecoder().decode(CreateRoomResponse.self, from: created).code == "K7PQX")
        let join = try Data(contentsOf: root.appending(path: "http.join.request.json"))
        #expect(try JSONDecoder().decode(JoinRoomRequest.self, from: join).name.isEmpty == false)
        let joined = try Data(contentsOf: root.appending(path: "http.join.response.json"))
        #expect(try JSONDecoder().decode(SeatCredential.self, from: joined).seatId == "s2")
        let health = try Data(contentsOf: root.appending(path: "http.health.json"))
        let parsed = try JSONDecoder().decode(HealthResponse.self, from: health)
        #expect(parsed.ok)
        #expect(parsed.protocolVersion == 1)
    }
}

@Suite("Server config")
struct ServerConfigTests {
    @Test("Production socket URL repeats every token")
    func webSocketURL() throws {
        let url = try #require(
            ServerConfig.production.webSocketURL(code: "K7PQX", tokens: ["alpha", "beta"])
        )
        #expect(url.scheme == "wss")
        #expect(url.host == "tint-server.tint-server.workers.dev")
        #expect(url.path == "/api/rooms/K7PQX/ws")
        let query = try #require(url.query)
        #expect(query.contains("token=alpha"))
        #expect(query.contains("token=beta"))
        #expect(query.contains("pv=1"))
    }

    @Test("Debug override replaces the default host")
    func override() {
        let defaults = UserDefaults(suiteName: "tint.test.\(UUID().uuidString)")!
        defaults.set("http://127.0.0.1:8787", forKey: ServerConfig.overrideKey)
        #expect(ServerConfig.resolved(defaults: defaults).baseURL.host == "127.0.0.1")
    }

    @Test("Backoff doubles from half a second and stops at eight")
    func backoff() {
        #expect(RoomClient.backoff(attempt: 1, random: 0.5) == .milliseconds(500))
        #expect(RoomClient.backoff(attempt: 2, random: 0.5) == .milliseconds(1000))
        #expect(RoomClient.backoff(attempt: 5, random: 0.5) == .seconds(8))
        #expect(RoomClient.backoff(attempt: 1, random: 0) == .milliseconds(400))
        #expect(RoomClient.backoff(attempt: 1, random: 1) == .milliseconds(600))
    }
}

private func fixturesRoot(file: String = #filePath) throws -> URL {
    var url = URL(fileURLWithPath: file).deletingLastPathComponent()
    while url.path != "/" {
        let candidate = url.appending(path: "shared/fixtures")
        if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
        url.deleteLastPathComponent()
    }
    Issue.record("shared/fixtures not found from \(file)")
    throw FixtureError.missing
}

private func fixtureURLs(prefix: String) throws -> [URL] {
    let directory = try fixturesRoot().appending(path: "messages")
    return try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        .filter { $0.lastPathComponent.hasPrefix(prefix) && $0.pathExtension == "json" }
        .sorted { $0.lastPathComponent < $1.lastPathComponent }
}

private func jsonEqual(_ left: Data, _ right: Data) -> Bool {
    guard let a = try? JSONSerialization.jsonObject(with: left),
          let b = try? JSONSerialization.jsonObject(with: right)
    else { return false }
    return jsonEqualValue(a, b)
}

private func jsonEqualValue(_ left: Any, _ right: Any) -> Bool {
    let leftBool = left as? NSNumber
    let rightBool = right as? NSNumber
    if let leftBool, let rightBool,
       CFGetTypeID(leftBool) == CFBooleanGetTypeID(),
       CFGetTypeID(rightBool) == CFBooleanGetTypeID()
    {
        return leftBool.boolValue == rightBool.boolValue
    }
    switch (left, right) {
    case let (l as String, r as String):
        return l == r
    case let (l as NSNumber, r as NSNumber):
        return l.doubleValue == r.doubleValue
    case let (l as [Any], r as [Any]):
        return l.count == r.count && zip(l, r).allSatisfy(jsonEqualValue)
    case let (l as [String: Any], r as [String: Any]):
        guard l.count == r.count else { return false }
        return l.allSatisfy { key, value in
            guard let other = r[key] else { return false }
            return jsonEqualValue(value, other)
        }
    default:
        return false
    }
}

private enum FixtureError: Error { case missing }

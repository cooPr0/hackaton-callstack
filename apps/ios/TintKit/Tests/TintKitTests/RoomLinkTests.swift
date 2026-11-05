import Foundation
import Testing
import TintKit

@Suite("Room links")
struct RoomLinkTests {
    @Test("A bare code and the public room and join URLs")
    func parses() {
        #expect(RoomLink.code(from: "tx3wb") == "TX3WB")
        #expect(RoomLink.code(from: "https://tint-and-tell.pages.dev/room/TX3WB") == "TX3WB")
        #expect(RoomLink.code(from: "https://tint-and-tell.pages.dev/join/TX3WB") == "TX3WB")
        #expect(RoomLink.code(from: "tintandtell://join/TX3WB") == "TX3WB")
        let url = URL(string: "https://tint-and-tell.pages.dev/room/TX3WB")!
        #expect(RoomLink.code(from: url) == "TX3WB")
    }

    @Test("Ambiguous letters and short strings are not codes")
    func rejects() {
        #expect(RoomLink.code(from: "TX3W") == nil)
        #expect(RoomLink.code(from: "ILO01") == nil)
        #expect(RoomLink.code(from: "https://tint-and-tell.pages.dev/") == nil)
    }
}

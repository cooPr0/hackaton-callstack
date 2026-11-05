import Foundation

extension ClientMessage {
    private enum Kind: String, Codable {
        case hello
        case gameStart = "game.start"
        case clueSubmit = "clue.submit"
        case stonePlace = "stone.place"
        case roundNext = "round.next"
        case pauseSet = "pause.set"
        case gameEnd = "game.end"
        case ping
        case grokAsk = "grok.ask"
        case voiceTicket = "voice.ticket"
    }

    private enum Key: String, CodingKey {
        case type, cid, pv, platform, name, seatId, text, x, y, paused, draft
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Key.self)
        let type = try container.decode(Kind.self, forKey: .type)
        let cid = try container.decode(String.self, forKey: .cid)
        switch type {
        case .hello:
            self = .hello(
                cid: cid,
                platform: try container.decode(Platform.self, forKey: .platform),
                name: try container.decodeIfPresent(String.self, forKey: .name)
            )
        case .gameStart:
            self = .gameStart(cid: cid)
        case .clueSubmit:
            self = .clueSubmit(
                cid: cid,
                seatId: try container.decode(String.self, forKey: .seatId),
                text: try container.decode(String.self, forKey: .text)
            )
        case .stonePlace:
            self = .stonePlace(
                cid: cid,
                seatId: try container.decode(String.self, forKey: .seatId),
                x: try container.decode(Int.self, forKey: .x),
                y: try container.decode(Int.self, forKey: .y)
            )
        case .roundNext:
            self = .roundNext(cid: cid)
        case .pauseSet:
            self = .pauseSet(cid: cid, paused: try container.decode(Bool.self, forKey: .paused))
        case .gameEnd:
            self = .gameEnd(cid: cid)
        case .ping:
            self = .ping(cid: cid)
        case .grokAsk:
            self = .grokAsk(
                cid: cid,
                seatId: try container.decode(String.self, forKey: .seatId),
                draft: try container.decodeIfPresent(String.self, forKey: .draft)
            )
        case .voiceTicket:
            self = .voiceTicket(cid: cid, seatId: try container.decode(String.self, forKey: .seatId))
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Key.self)
        try container.encode(cid, forKey: .cid)
        switch self {
        case .hello(_, let platform, let name):
            try container.encode(Kind.hello, forKey: .type)
            try container.encode(ProtocolConstant.version, forKey: .pv)
            try container.encode(platform, forKey: .platform)
            try container.encodeIfPresent(name, forKey: .name)
        case .gameStart:
            try container.encode(Kind.gameStart, forKey: .type)
        case .clueSubmit(_, let seatId, let text):
            try container.encode(Kind.clueSubmit, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encode(text, forKey: .text)
        case .stonePlace(_, let seatId, let x, let y):
            try container.encode(Kind.stonePlace, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encode(x, forKey: .x)
            try container.encode(y, forKey: .y)
        case .roundNext:
            try container.encode(Kind.roundNext, forKey: .type)
        case .pauseSet(_, let paused):
            try container.encode(Kind.pauseSet, forKey: .type)
            try container.encode(paused, forKey: .paused)
        case .gameEnd:
            try container.encode(Kind.gameEnd, forKey: .type)
        case .ping:
            try container.encode(Kind.ping, forKey: .type)
        case .grokAsk(_, let seatId, let draft):
            try container.encode(Kind.grokAsk, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encodeIfPresent(draft, forKey: .draft)
        case .voiceTicket(_, let seatId):
            try container.encode(Kind.voiceTicket, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
        }
    }
}

extension ServerMessage {
    private enum Kind: String, Codable {
        case welcome
        case view
        case botStatus = "bot.status"
        case botSay = "bot.say"
        case grokHint = "grok.hint"
        case voiceReady = "voice.ready"
        case ack
        case error
        case pong
    }

    private enum Key: String, CodingKey {
        case type, seatIds, serverTime, seq, view, seatId, state, text, audioUrl, citations
        case cid, code, message
        case protocolVersion = "protocol"
        case value, expiresAt, url, model, voice, session
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Key.self)
        switch try container.decode(Kind.self, forKey: .type) {
        case .welcome:
            self = .welcome(
                seatIds: try container.decode([String].self, forKey: .seatIds),
                serverTime: try container.decode(Int.self, forKey: .serverTime),
                protocolVersion: try container.decode(Int.self, forKey: .protocolVersion)
            )
        case .view:
            self = .view(
                seq: try container.decode(Int.self, forKey: .seq),
                view: try container.decode(PlayerView.self, forKey: .view)
            )
        case .botStatus:
            self = .botStatus(
                seatId: try container.decode(String.self, forKey: .seatId),
                state: try container.decode(BotState.self, forKey: .state)
            )
        case .botSay:
            self = .botSay(
                seatId: try container.decode(String.self, forKey: .seatId),
                text: try container.decode(String.self, forKey: .text),
                audioUrl: try container.decodeIfPresent(String.self, forKey: .audioUrl)
            )
        case .grokHint:
            self = .grokHint(
                seatId: try container.decode(String.self, forKey: .seatId),
                text: try container.decode(String.self, forKey: .text),
                citations: try container.decode([Citation].self, forKey: .citations)
            )
        case .voiceReady:
            self = .voiceReady(try VoiceReady(from: decoder))
        case .ack:
            self = .ack(cid: try container.decode(String.self, forKey: .cid))
        case .error:
            let raw = try container.decode(String.self, forKey: .code)
            guard let code = ErrorCode(rawValue: raw) else {
                throw DecodingError.dataCorruptedError(
                    forKey: .code,
                    in: container,
                    debugDescription: "unknown error code \(raw)"
                )
            }
            self = .error(
                cid: try container.decodeIfPresent(String.self, forKey: .cid),
                code: code,
                message: try container.decode(String.self, forKey: .message)
            )
        case .pong:
            self = .pong
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: Key.self)
        switch self {
        case .welcome(let seatIds, let serverTime, let protocolVersion):
            try container.encode(Kind.welcome, forKey: .type)
            try container.encode(seatIds, forKey: .seatIds)
            try container.encode(serverTime, forKey: .serverTime)
            try container.encode(protocolVersion, forKey: .protocolVersion)
        case .view(let seq, let view):
            try container.encode(Kind.view, forKey: .type)
            try container.encode(seq, forKey: .seq)
            try container.encode(view, forKey: .view)
        case .botStatus(let seatId, let state):
            try container.encode(Kind.botStatus, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encode(state, forKey: .state)
        case .botSay(let seatId, let text, let audioUrl):
            try container.encode(Kind.botSay, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encode(text, forKey: .text)
            try container.encodeIfPresent(audioUrl, forKey: .audioUrl)
        case .grokHint(let seatId, let text, let citations):
            try container.encode(Kind.grokHint, forKey: .type)
            try container.encode(seatId, forKey: .seatId)
            try container.encode(text, forKey: .text)
            try container.encode(citations, forKey: .citations)
        case .voiceReady(let ready):
            try container.encode(Kind.voiceReady, forKey: .type)
            try container.encode(ready.seatId, forKey: .seatId)
            try container.encode(ready.value, forKey: .value)
            try container.encode(ready.expiresAt, forKey: .expiresAt)
            try container.encode(ready.url, forKey: .url)
            try container.encode(ready.model, forKey: .model)
            try container.encode(ready.voice, forKey: .voice)
            try container.encode(ready.session, forKey: .session)
        case .ack(let cid):
            try container.encode(Kind.ack, forKey: .type)
            try container.encode(cid, forKey: .cid)
        case .error(let cid, let code, let message):
            try container.encode(Kind.error, forKey: .type)
            try container.encodeIfPresent(cid, forKey: .cid)
            try container.encode(code, forKey: .code)
            try container.encode(message, forKey: .message)
        case .pong:
            try container.encode(Kind.pong, forKey: .type)
        }
    }
}

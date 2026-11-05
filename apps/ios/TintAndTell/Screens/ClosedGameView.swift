import Inject
import SwiftUI
import TintDesign
import TintKit
import UIKit

/// The secret the closed phone is allowed to show: a 7 × 9 window, never a coordinate.
struct ClosedRound: Equatable {
    var round: Int
    var totalRounds: Int
    var cueGiver: String
    /// When Grok holds the secret the closed screen shows no color.
    var hidesShade: Bool
    var originX: Int
    var originY: Int
    var targetX: Int
    var targetY: Int
    var clue: String

    static let rosol = ClosedRound(
        round: 3,
        totalRounds: 6,
        cueGiver: "Kuba",
        hidesShade: false,
        originX: 1,
        originY: 0,
        targetX: 4,
        targetY: 3,
        clue: "Rosół"
    )

    static func draw(cueGiver: String, hidesShade: Bool, round: Int = 1, totalRounds: Int = 6) -> ClosedRound {
        let targetX = Int.random(in: 0..<BoardPalette.columns)
        let targetY = Int.random(in: 0..<BoardPalette.rows)
        let originX = min(max(targetX - 3, 0), BoardPalette.columns - 7)
        let originY = min(max(targetY - 4, 0), BoardPalette.rows - 9)
        return ClosedRound(
            round: round,
            totalRounds: totalRounds,
            cueGiver: cueGiver,
            hidesShade: hidesShade,
            originX: originX,
            originY: originY,
            targetX: targetX,
            targetY: targetY,
            clue: ""
        )
    }
}

/// Closed Duo: the cue giver sees a 7 × 9 window and types the first word.
struct ClosedGameView: View {
    @ObserveInjection private var inject
    @State private var clue: String
    @FocusState private var isTyping: Bool

    private var round: ClosedRound
    var onClue: (String) -> Void

    init(round: ClosedRound, onClue: @escaping (String) -> Void = { _ in }) {
        self.round = round
        self.onClue = onClue
        _clue = State(initialValue: round.clue)
    }

    var body: some View {
        GeometryReader { geo in
            let chrome: CGFloat = round.hidesShade ? 220 : 280
            let finderHeight = min(geo.size.width * 9 / 7, max(geo.size.height - chrome, 220))

            VStack(alignment: .leading, spacing: 0) {
                header

                if round.hidesShade {
                    Spacer(minLength: 24)
                    Text("Grok zna\nodcień")
                        .font(.system(size: 56, weight: .heavy).width(.expanded))
                        .tracking(-1.7)
                        .foregroundStyle(Color.ink)
                    Text("Nikt nie musi patrzeć. Rozłóż telefon, Grok poda podpowiedź na stole.")
                        .font(.system(size: 15))
                        .foregroundStyle(Color.ink2)
                        .padding(.top, 16)
                    Spacer(minLength: 24)
                } else {
                    Viewfinder(
                        originX: round.originX,
                        originY: round.originY,
                        targetX: round.targetX,
                        targetY: round.targetY
                    )
                    .frame(height: finderHeight)
                    .padding(.top, 20)
                    .frame(maxWidth: .infinity)

                    Text("Pierwsza podpowiedź, jedno słowo")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.ink2)
                        .padding(.top, 32)

                    TextField("słowo", text: $clue)
                        .font(.system(size: 56, weight: .heavy).width(.expanded))
                        .tracking(-1.7)
                        .foregroundStyle(Color.ink)
                        .textFieldStyle(.plain)
                        .textInputAutocapitalization(.words)
                        .submitLabel(.done)
                        .focused($isTyping)
                        .lineLimit(1)
                        .minimumScaleFactor(0.4)
                        .padding(.top, 10)
                        .accessibilityLabel("Pierwsza podpowiedź")
                        .onChange(of: clue) { _, newValue in
                            let word = ClosedGameView.oneWord(newValue)
                            if word != newValue { clue = word }
                        }
                        .onSubmit {
                            let word = clue.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !word.isEmpty else { return }
                            onClue(word)
                        }

                    Text("Bez nazw kolorów i bez pozycji na planszy.")
                        .font(.system(size: 15))
                        .foregroundStyle(Color.ink2)
                        .padding(.top, 12)
                        .fixedSize(horizontal: false, vertical: true)

                    Spacer(minLength: 16)
                }

                unfoldHint
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 24)
            .padding(.top, 14)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
        }
        .background(Color.ground.ignoresSafeArea())
        .onAppear {
            if clue.isEmpty, !round.hidesShade { isTyping = true }
        }
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Text(headerLine)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.ink2)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            PauseButton()
        }
        .frame(minHeight: 44)
    }

    private var headerLine: String {
        if round.hidesShade {
            "Runda \(round.round) z \(round.totalRounds) · podpowiada Grok"
        } else {
            "Runda \(round.round) z \(round.totalRounds) · złożone, patrzy tylko \(round.cueGiver)"
        }
    }

    private var unfoldHint: some View {
        HStack(spacing: 14) {
            FoldedDuoMark()
            Text("Rozłóż telefon na stole")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.ink)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Rozłóż telefon na stole")
    }

    /// First clue is a single word, at most 24 characters.
    static func oneWord(_ raw: String) -> String {
        let first = raw.split(whereSeparator: \.isWhitespace).first.map(String.init) ?? ""
        return String(first.prefix(24))
    }
}

/// A guess copied into the closed window. Coordinates stay off the screen.
struct FinderStone: Identifiable, Equatable {
    let id: UUID
    var x: Int
    var y: Int
    var player: GamePlayer

    /// Ola one step left and two up from the target, Grok two right and one down. Same places as the cabin mock.
    static func sampleGuesses(around round: ClosedRound) -> [FinderStone] {
        let ola = GamePlayer.openingTable[1]
        let marks: [(Int, Int, GamePlayer)] = [(-1, -2, ola), (2, 1, .grok)]
        return marks.compactMap { dx, dy, player in
            let x = round.targetX + dx
            let y = round.targetY + dy
            guard (0..<BoardPalette.columns).contains(x), (0..<BoardPalette.rows).contains(y) else { return nil }
            return FinderStone(id: UUID(), x: x, y: y, player: player)
        }
    }
}

/// 7 columns × 9 rows of the board, with corner brackets on the secret cell.
struct Viewfinder: View {
    var originX: Int
    var originY: Int
    var targetX: Int
    var targetY: Int
    var stones: [FinderStone] = []

    private let columns = 7
    private let rows = 9
    private let grout: CGFloat = 5

    var body: some View {
        PalettePatch(x0: originX, y0: originY, columns: columns, rows: rows, grout: grout, corner: 4)
            .overlay {
                GeometryReader { geo in
                    let cellW = (geo.size.width - grout * CGFloat(columns - 1)) / CGFloat(columns)
                    let cellH = (geo.size.height - grout * CGFloat(rows - 1)) / CGFloat(rows)
                    let stoneSize = min(cellW, cellH) * 0.66
                    let target = CGRect(
                        x: CGFloat(targetX - originX) * (cellW + grout),
                        y: CGFloat(targetY - originY) * (cellH + grout),
                        width: cellW,
                        height: cellH
                    )
                    ZStack {
                        ForEach(stones) { stone in
                            let column = stone.x - originX
                            let row = stone.y - originY
                            if (0..<columns).contains(column), (0..<rows).contains(row) {
                                SeatStone(
                                    player: stone.player,
                                    size: stoneSize,
                                    hole: BoardPalette.color(x: stone.x, y: stone.y)
                                )
                                .position(
                                    x: (CGFloat(column) + 0.5) * cellW + CGFloat(column) * grout,
                                    y: (CGFloat(row) + 0.5) * cellH + CGFloat(row) * grout
                                )
                            }
                        }
                        CornerBracket()
                            .stroke(Color.ink, style: StrokeStyle(lineWidth: 3, lineCap: .square, lineJoin: .miter))
                            .frame(width: target.width + 16, height: target.height + 16)
                            .position(x: target.midX, y: target.midY)
                    }
                }
            }
            .accessibilityLabel(stones.isEmpty ? "Wizjer odcienia" : "Wizjer odcienia z kopiami kamieni")
    }
}

struct CornerBracket: Shape {
    var armLength: CGFloat = 15

    nonisolated func path(in rect: CGRect) -> Path {
        var path = Path()
        let arm = min(armLength, rect.width / 2, rect.height / 2)
        let corners: [(CGPoint, CGPoint, CGPoint)] = [
            (
                CGPoint(x: rect.minX, y: rect.minY + arm),
                CGPoint(x: rect.minX, y: rect.minY),
                CGPoint(x: rect.minX + arm, y: rect.minY)
            ),
            (
                CGPoint(x: rect.maxX - arm, y: rect.minY),
                CGPoint(x: rect.maxX, y: rect.minY),
                CGPoint(x: rect.maxX, y: rect.minY + arm)
            ),
            (
                CGPoint(x: rect.minX, y: rect.maxY - arm),
                CGPoint(x: rect.minX, y: rect.maxY),
                CGPoint(x: rect.minX + arm, y: rect.maxY)
            ),
            (
                CGPoint(x: rect.maxX - arm, y: rect.maxY),
                CGPoint(x: rect.maxX, y: rect.maxY),
                CGPoint(x: rect.maxX, y: rect.maxY - arm)
            ),
        ]
        for (start, corner, end) in corners {
            path.move(to: start)
            path.addLine(to: corner)
            path.addLine(to: end)
        }
        return path
    }
}

/// Two halves of the folded Duo, the cue to open the phone onto the table.
struct FoldedDuoMark: View {
    var body: some View {
        Canvas { context, size in
            let scale = size.width / 36
            func half(_ x: CGFloat) -> Path {
                Path(
                    roundedRect: CGRect(x: x * scale, y: 1.5 * scale, width: 14 * scale, height: 21 * scale),
                    cornerRadius: 3.5 * scale
                )
            }
            let stroke = StrokeStyle(lineWidth: 2.4 * scale, lineJoin: .round)
            context.stroke(half(1.5), with: .color(Color.ink), style: stroke)
            context.stroke(half(20.5), with: .color(Color.ink), style: stroke)
        }
        .frame(width: 36, height: 24)
        .accessibilityHidden(true)
    }
}

struct GameShell: View {
    private enum Phase {
        case setup
        case join(code: String)
        case online(RoomSession)
        case first(ClosedRound)
        case table(ClosedRound, firstClue: String, local: Bool)
        case second(ClosedRound, firstClue: String, stones: [FinderStone])
        case roundEnd(RoundCard)
        case pass(RoundCard)
    }

    private enum PostureOverride {
        case system
        case open
        case closed
    }

    @ObserveInjection var inject
    @Environment(IncomingLink.self) private var links
    @State private var phase = Phase.setup
    @State private var players = GamePlayer.openingTable
    @State private var mode = PartyMode.stol
    @State private var scores: [String: Int] = [:]
    @State private var isPaused = false
    @State private var measuredWide = false
    @State private var hardwareFold = DeviceFold.none
    @State private var postureOverride = PostureOverride.system

    private var wideOpen: Bool {
        switch postureOverride {
        case .open: true
        case .closed: false
        case .system: measuredWide
        }
    }

    private var fold: DeviceFold {
        switch postureOverride {
        case .open: .open
        case .closed: .closed
        case .system: hardwareFold
        }
    }

    private var posture: TablePosture {
        TablePosture(wideOpen: wideOpen, fold: fold)
    }

    var body: some View {
        Group {
            phaseContent
        }
        .environment(\.openPause, { isPaused = true })
        .onChange(of: links.arrival?.id) { _, _ in
            guard let code = links.arrival?.code else { return }
            Task { await arrive(code) }
        }
        .onGeometryChange(for: Bool.self) { proxy in
            isWideOpenTable(size: proxy.size)
        } action: { measuredWide = $0 }
        .onHingeChange { _, context in
            hardwareFold = DeviceFold(context.hinge)
        }
        .gesture(ThreeFingerPostureToggle { cyclePostureOverride() })
        .enableInjection()
        .sheet(isPresented: $isPaused) {
            let context = pauseContext
            PauseSheet(
                round: context.round,
                totalRounds: context.total,
                scoreLine: context.scores,
                onResume: { isPaused = false },
                onPassRole: { isPaused = false },
                onEnd: {
                    isPaused = false
                    phase = .setup
                    scores = Dictionary(uniqueKeysWithValues: players.map { ($0.name, 0) })
                }
            )
            .presentationDetents([.height(400)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(38)
        }
    }

    private func arrive(_ code: String) async {
        if case .online(let session) = phase {
            session.leave()
        }
        let stored = try? KeychainTokenStore().load(code: code)
        if let stored, !stored.isEmpty {
            let session = RoomSession(code: code)
            let name = UserDefaults.standard.string(forKey: RoomSession.nameKey)
            do {
                try await session.connect(tokens: stored, name: name)
                phase = .online(session)
                return
            } catch {
                session.leave()
            }
        }
        phase = .join(code: code)
    }

    @ViewBuilder
    private var phaseContent: some View {
        switch phase {
        case .setup:
            NewGameView(onJoin: { phase = .join(code: "") }) { mode, players in
                self.mode = mode
                self.players = players
                self.scores = Dictionary(uniqueKeysWithValues: players.map { ($0.name, 0) })
                let giver = mode == .grok
                    ? "Grok"
                    : (players.first { $0.kind == .human }?.name ?? "Gracz")
                phase = .first(.draw(cueGiver: giver, hidesShade: mode == .grok))
            }
        case .join(let code):
            JoinRoomView(initialCode: code, onCancel: { phase = .setup }) { session in
                phase = .online(session)
            }
            .id(code)
        case .online(let session):
            OnlineRoomView(session: session) {
                session.leave()
                phase = .setup
            }
        case .first(let round):
            if round.hidesShade {
                grokSecret(round)
            } else if localKeepsShade(wideOpen: wideOpen, fold: fold) {
                ClosedGameView(round: round) { clue in
                    phase = .table(round, firstClue: clue, local: true)
                }
            } else {
                FoldPrompt(name: round.cueGiver)
            }
        case .table(let round, let firstClue, let local):
            sharedTable(round: round, firstClue: firstClue, local: local)
        case .second(let round, let firstClue, let stones):
            if localKeepsShade(wideOpen: wideOpen, fold: fold) {
                SecondPeekView(round: round, firstClue: firstClue, stones: stones) { second in
                    phase = .roundEnd(card(round: round, firstClue: firstClue, secondClue: second, stones: stones))
                }
            } else {
                FoldPrompt(name: round.cueGiver)
            }
        case .roundEnd(let card):
            RoundEndView(card: card) {
                guard !card.isLastRound else { return }
                phase = .pass(card)
            }
        case .pass(let card):
            PassTurnView(card: card) {
                phase = .first(
                    .draw(
                        cueGiver: card.nextPlayer,
                        hidesShade: card.nextPlayer == "Grok",
                        round: card.finishedRound + 1,
                        totalRounds: card.totalRounds
                    )
                )
            }
        }
    }

    private var pauseContext: (round: Int, total: Int, scores: String) {
        let line = players
            .enumerated()
            .sorted { left, right in
                let leftScore = scores[left.element.name] ?? 0
                let rightScore = scores[right.element.name] ?? 0
                if leftScore != rightScore { return leftScore > rightScore }
                return left.offset < right.offset
            }
            .map { "\($0.element.name) \(scores[$0.element.name] ?? 0)" }
            .joined(separator: ", ")
        switch phase {
        case .setup, .join, .online:
            return (1, 6, line)
        case .first(let round), .table(let round, _, _), .second(let round, _, _):
            return (round.round, round.totalRounds, line)
        case .roundEnd(let card), .pass(let card):
            return (card.finishedRound, card.totalRounds, line)
        }
    }

    /// Grok's secret: the sealed card while the phone is closed, the waiting table once it is open.
    /// Guessing from here is online: this phone does not hold the shade.
    @ViewBuilder
    private func grokSecret(_ round: ClosedRound) -> some View {
        if case .askToOpen = tableSurface(local: false, moment: .grokSecret, wideOpen: wideOpen, fold: fold) {
            ShadeSealView(round: round.round, totalRounds: round.totalRounds, knower: round.cueGiver) {
                phase = .table(round, firstClue: "Grok", local: false)
            }
        } else {
            sharedTable(round: round, firstClue: "Grok", local: false)
        }
    }

    /// Guessing. Local play withholds the board until the phone is the table.
    /// Online play on a phone with no hinge keeps the board, turned upright.
    /// A folded Duo asks to open in both games.
    private func sharedTable(round: ClosedRound, firstClue: String, local: Bool) -> some View {
        let surface = tableSurface(local: local, moment: .playing, wideOpen: wideOpen, fold: fold)
        return TableView(local: local, posture: posture) { _, _ in }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if case .board = surface {
                    Button {
                        if local {
                            phase = .second(
                                round,
                                firstClue: firstClue,
                                stones: FinderStone.sampleGuesses(around: round)
                            )
                        } else {
                            let stones = FinderStone.sampleGuesses(around: round)
                            phase = .roundEnd(
                                card(round: round, firstClue: firstClue, secondClue: "", stones: stones)
                            )
                        }
                    } label: {
                        Text(local ? "Druga podpowiedź" : "Pokaż odcień")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color.ground)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(Color.ink, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                    .padding(.bottom, 14)
                    .background(Color.ground)
                }
            }
    }

    private func cyclePostureOverride() {
        switch postureOverride {
        case .system: postureOverride = .open
        case .open: postureOverride = .closed
        case .closed: postureOverride = .system
        }
    }

    private func card(round: ClosedRound, firstClue: String, secondClue: String, stones: [FinderStone]) -> RoundCard {
        let next = nextCueGiver(after: round.cueGiver)
        let inHouse = stones.filter {
            max(abs($0.x - round.targetX), abs($0.y - round.targetY)) <= 1
        }.count
        let guessers = players.map(\.name).filter { $0 != next.name }
        return RoundCard(
            finishedRound: round.round,
            totalRounds: round.totalRounds,
            cueGiver: round.cueGiver,
            targetX: round.targetX,
            targetY: round.targetY,
            firstClue: firstClue,
            secondClue: secondClue,
            stonesInHouse: inHouse,
            nextPlayer: next.name,
            guessers: guessers,
            scores: players.map { ScoreLine(name: $0.name, score: scores[$0.name] ?? 0) }
        )
    }

    private func nextCueGiver(after name: String) -> GamePlayer {
        if mode == .grok { return .grok }
        let humans = players.filter { $0.kind == .human }
        guard let index = humans.firstIndex(where: { $0.name == name }), !humans.isEmpty else {
            return humans.first ?? .grok
        }
        return humans[(index + 1) % humans.count]
    }
}

/// Debug stand-in for folding the Duo. Three fingers, so a normal tap still places a stone.
private struct ThreeFingerPostureToggle: UIGestureRecognizerRepresentable {
    var action: () -> Void

    func makeUIGestureRecognizer(context: Context) -> UITapGestureRecognizer {
        let tap = UITapGestureRecognizer()
        tap.numberOfTouchesRequired = 3
        tap.numberOfTapsRequired = 1
        tap.cancelsTouchesInView = false
        tap.delaysTouchesBegan = false
        return tap
    }

    func handleUIGestureRecognizerAction(_ recognizer: UITapGestureRecognizer, context: Context) {
        if recognizer.state == .ended {
            action()
        }
    }
}

#Preview("Rosół") {
    ClosedGameView(round: .rosol)
}

#Preview("Ciemny") {
    ClosedGameView(round: .rosol)
        .preferredColorScheme(.dark)
}

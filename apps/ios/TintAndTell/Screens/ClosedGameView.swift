import Inject
import SwiftUI

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

    init(round: ClosedRound) {
        self.round = round
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
                        .foregroundStyle(Color("Ink"))
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
                        .foregroundStyle(Color("Ink"))
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
        .background(Color("Paper").ignoresSafeArea())
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
            Button {} label: {
                Image(systemName: "pause.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color("Ink"))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Pauza")
        }
        .frame(minHeight: 44)
    }

    private var headerLine: String {
        if round.hidesShade {
            "Runda \(round.round) z \(round.totalRounds) · podpowiada Grok"
        } else {
            "Runda \(round.round) z \(round.totalRounds) · patrzy tylko \(round.cueGiver)"
        }
    }

    private var unfoldHint: some View {
        HStack(spacing: 14) {
            FoldedDuoMark()
            Text("Rozłóż telefon na stole")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color("Ink"))
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

/// 7 columns × 9 rows of the board, with corner brackets on the secret cell.
private struct Viewfinder: View {
    var originX: Int
    var originY: Int
    var targetX: Int
    var targetY: Int

    private let columns = 7
    private let rows = 9
    private let grout: CGFloat = 5

    var body: some View {
        PalettePatch(x0: originX, y0: originY, columns: columns, rows: rows, grout: grout, corner: 4)
            .overlay {
                GeometryReader { geo in
                    let cellW = (geo.size.width - grout * CGFloat(columns - 1)) / CGFloat(columns)
                    let cellH = (geo.size.height - grout * CGFloat(rows - 1)) / CGFloat(rows)
                    let column = targetX - originX
                    let row = targetY - originY
                    let rect = CGRect(
                        x: CGFloat(column) * (cellW + grout),
                        y: CGFloat(row) * (cellH + grout),
                        width: cellW,
                        height: cellH
                    )
                    CornerBracket()
                        .stroke(Color("Ink"), style: StrokeStyle(lineWidth: 3, lineCap: .square, lineJoin: .miter))
                        .frame(width: rect.width + 16, height: rect.height + 16)
                        .position(x: rect.midX, y: rect.midY)
                }
            }
            .accessibilityLabel("Wizjer odcienia")
    }
}

private struct CornerBracket: Shape {
    nonisolated func path(in rect: CGRect) -> Path {
        var path = Path()
        let arm = min(15, rect.width / 2, rect.height / 2)
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
private struct FoldedDuoMark: View {
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
            context.stroke(half(1.5), with: .color(Color("Ink")), style: stroke)
            context.stroke(half(20.5), with: .color(Color("Ink")), style: stroke)
        }
        .frame(width: 36, height: 24)
        .accessibilityHidden(true)
    }
}

struct GameShell: View {
    @State private var round: ClosedRound?

    var body: some View {
        if let round {
            ClosedGameView(round: round)
        } else {
            NewGameView { mode, players in
                let giver = mode == .grok
                    ? "Grok"
                    : (players.first { $0.kind == .human }?.name ?? "Gracz")
                self.round = .draw(cueGiver: giver, hidesShade: mode == .grok)
            }
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

import Inject
import SwiftUI

/// Closed Duo, second look: the same 7 × 9 window, now with the guesses, and up to two more words.
struct SecondPeekView: View {
    @ObserveInjection private var inject
    @State private var clue: String
    @FocusState private var isTyping: Bool

    private var round: ClosedRound
    private var firstClue: String
    private var stones: [FinderStone]

    init(round: ClosedRound, firstClue: String, stones: [FinderStone], clue: String = "") {
        self.round = round
        self.firstClue = firstClue
        self.stones = stones
        _clue = State(initialValue: clue)
    }

    var body: some View {
        GeometryReader { geo in
            let finderHeight = min(geo.size.width * 9 / 7, max(geo.size.height - 250, 220))

            VStack(alignment: .leading, spacing: 0) {
                header

                Viewfinder(
                    originX: round.originX,
                    originY: round.originY,
                    targetX: round.targetX,
                    targetY: round.targetY,
                    stones: stones
                )
                .frame(height: finderHeight)
                .padding(.top, 20)
                .frame(maxWidth: .infinity)

                HStack(alignment: .firstTextBaseline) {
                    Text(frameLine)
                    Spacer(minLength: 12)
                    Text("Było: \(firstClue)")
                }
                .font(.system(size: 15))
                .foregroundStyle(Color.ink2)
                .padding(.top, 12)

                Text("Druga podpowiedź, do dwóch słów")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ink2)
                    .padding(.top, 24)

                TextField("słowa", text: $clue)
                    .font(.system(size: 44, weight: .heavy).width(.expanded))
                    .tracking(-1.3)
                    .foregroundStyle(Color("Ink"))
                    .textFieldStyle(.plain)
                    .textInputAutocapitalization(.never)
                    .submitLabel(.done)
                    .focused($isTyping)
                    .lineLimit(1)
                    .minimumScaleFactor(0.45)
                    .padding(.top, 10)
                    .accessibilityLabel("Druga podpowiedź")
                    .onChange(of: clue) { _, newValue in
                        let words = SecondPeekView.twoWords(newValue)
                        if words != newValue { clue = words }
                    }

                Spacer(minLength: 16)

                HStack(spacing: 14) {
                    FoldedDuoMark()
                    Text("Rozłóż, żeby pokazać")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color("Ink"))
                }
                .padding(.bottom, 20)
                .accessibilityElement(children: .combine)
            }
            .padding(.horizontal, 24)
            .padding(.top, 14)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
        }
        .background(Color("Paper").ignoresSafeArea())
        .onAppear {
            if clue.isEmpty { isTyping = true }
        }
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Text("Runda \(round.round) z \(round.totalRounds) · złożone, patrzy tylko \(round.cueGiver)")
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

    private var frameLine: String {
        let inside = stones.filter { stone in
            let column = stone.x - round.originX
            let row = stone.y - round.originY
            return (0..<7).contains(column) && (0..<9).contains(row)
        }.count
        switch inside {
        case 0: return "Żaden kamień w kadrze"
        case 1: return "Jeden kamień w kadrze"
        case 2: return "Oba kamienie w kadrze"
        default: return "\(inside) kamienie w kadrze"
        }
    }

    /// Second clue is one or two words, at most 24 characters.
    static func twoWords(_ raw: String) -> String {
        let collapsed = raw.replacingOccurrences(
            of: "\\s+",
            with: " ",
            options: .regularExpression
        )
        let keepsTrailingSpace = collapsed.hasSuffix(" ")
        let parts = collapsed.split(separator: " ", omittingEmptySubsequences: true).prefix(2)
        var joined = parts.joined(separator: " ")
        if keepsTrailingSpace, parts.count == 1 {
            joined += " "
        }
        return String(joined.prefix(24))
    }
}

#Preview("z marchewką") {
    SecondPeekView(
        round: .rosol,
        firstClue: "Rosół",
        stones: FinderStone.sampleGuesses(around: .rosol),
        clue: "z marchewką"
    )
}

#Preview("Ciemny") {
    SecondPeekView(
        round: .rosol,
        firstClue: "Rosół",
        stones: FinderStone.sampleGuesses(around: .rosol),
        clue: "z marchewką"
    )
    .preferredColorScheme(.dark)
}

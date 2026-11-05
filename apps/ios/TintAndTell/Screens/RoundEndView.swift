import Inject
import SwiftUI
import TintDesign

struct ScoreLine: Identifiable, Equatable {
    var name: String
    var score: Int
    var id: String { name }
}

/// What the closed phone shows once the round is over: the shade, the clues, then the next round.
struct RoundCard: Equatable {
    var finishedRound: Int
    var totalRounds: Int
    var cueGiver: String
    var targetX: Int
    var targetY: Int
    var firstClue: String
    var secondClue: String
    var stonesInHouse: Int
    var nextPlayer: String
    var guessers: [String]
    var scores: [ScoreLine]

    var isLastRound: Bool { finishedRound >= totalRounds }

    var caption: String {
        let second = secondClue.trimmingCharacters(in: .whitespacesAndNewlines)
        if second.isEmpty { return firstClue }
        return "\(firstClue),\n\(second)"
    }

    /// The cabin scene from the mock: Kuba's gold, then the phone goes to Ola.
    static let cabin = RoundCard(
        finishedRound: 3,
        totalRounds: 6,
        cueGiver: "Kuba",
        targetX: 4,
        targetY: 3,
        firstClue: "Rosół",
        secondClue: "z marchewką",
        stonesInHouse: 4,
        nextPlayer: "Ola",
        guessers: ["Grok", "Kuba"],
        scores: [
            ScoreLine(name: "Ola", score: 10),
            ScoreLine(name: "Grok", score: 8),
            ScoreLine(name: "Kuba", score: 6),
        ]
    )
}

struct RoundEndView: View {
    @ObserveInjection private var inject
    @Environment(\.colorScheme) private var scheme
    var card: RoundCard
    var onDrawNext: () -> Void

    init(card: RoundCard, onDrawNext: @escaping () -> Void = {}) {
        self.card = card
        self.onDrawNext = onDrawNext
    }

    var body: some View {
        GeometryReader { geo in
            let swatch = min(300, max(168, geo.size.height - 470))

            VStack(alignment: .leading, spacing: 0) {
                header

                VStack(spacing: 0) {
                    BoardPalette.color(x: card.targetX, y: card.targetY)
                        .frame(maxWidth: .infinity)
                        .frame(height: swatch)
                        .accessibilityLabel("Odcień rundy")

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Odcień · \(card.cueGiver) · \(PartyCopy.inHouse(card.stonesInHouse))")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(onPlate.opacity(0.72))
                        Text(card.caption)
                            .font(.system(size: 34, weight: .heavy).width(.expanded))
                            .tracking(-0.7)
                            .foregroundStyle(onPlate)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(EdgeInsets(top: 16, leading: 18, bottom: 18, trailing: 18))
                    .background(plate)
                }
                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                .shadow(color: .black.opacity(0.25), radius: 0, y: 1)
                .padding(.top, 18)

                Text(card.isLastRound ? "Wyniki" : "Następna runda")
                    .font(.system(size: 56, weight: .heavy).width(.expanded))
                    .tracking(-1.7)
                    .foregroundStyle(Color.ink)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .padding(.top, 36)

                Text(
                    card.isLastRound
                        ? "To była ostatnia runda. Czas na wyniki."
                        : "Podajcie telefon dalej. Następny odcień czeka."
                )
                .font(.system(size: 15))
                .foregroundStyle(Color.ink2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 12)

                Spacer(minLength: 16)

                HStack(alignment: .firstTextBaseline) {
                    Text(scoreLine)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.ink2)
                    Spacer(minLength: 12)
                    Text("Runda \(min(card.finishedRound + 1, card.totalRounds)) z \(card.totalRounds)")
                        .font(.system(size: 15))
                        .foregroundStyle(Color.ink2)
                }

                Button(action: onDrawNext) {
                    Text("Dalej")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ground)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color.ink, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(card.isLastRound)
                .padding(.top, 16)
                .padding(.bottom, 14)
            }
            .padding(.horizontal, 24)
            .padding(.top, 14)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
        }
        .background(Color.ground.ignoresSafeArea())
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Text("Koniec rundy \(card.finishedRound) z \(card.totalRounds)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.ink2)
                .frame(maxWidth: .infinity, alignment: .leading)
            PauseButton()
        }
        .frame(minHeight: 44)
    }

    private var scoreLine: String {
        card.scores.map { "\($0.name) \($0.score)" }.joined(separator: " · ")
    }

    /// The sample strip stays a dark plate in both schemes. Cold steel type does not flip with the page.
    private var plate: Color {
        scheme == .dark ? Color(hex: "0F0E0C") : Color.cocoa
    }

    private var onPlate: Color { Color(hex: "F8F7F4") }
}

/// Privacy gate before the next shade. No colour: the phone changes hands first.
struct PassTurnView: View {
    @ObserveInjection private var inject
    var card: RoundCard
    var onConfirm: () -> Void

    init(card: RoundCard, onConfirm: @escaping () -> Void = {}) {
        self.card = card
        self.onConfirm = onConfirm
    }

    var body: some View {
        GeometryReader { geo in
            VStack(alignment: .leading, spacing: 0) {
                header

                Spacer(minLength: 24)

                SeatStone(player: nextSeat, size: 72, hole: Color.ground)

                Text("\(card.nextPlayer), teraz Ty")
                    .font(.system(size: 56, weight: .heavy).width(.expanded))
                    .tracking(-1.7)
                    .foregroundStyle(Color.ink)
                    .minimumScaleFactor(0.45)
                    .lineLimit(2)
                    .padding(.top, 28)

                Text("Podaj telefon. Ta osoba zobaczy odcień, reszta zgaduje.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 12)

                Spacer(minLength: 16)

                Text(scoreLine)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.ink2)

                Button(action: onConfirm) {
                    Text("To ja, \(card.nextPlayer). Pokaż odcień")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ground)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color.ink, in: Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, 16)
                .padding(.bottom, 14)
            }
            .padding(.horizontal, 24)
            .padding(.top, 14)
            .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
        }
        .background(Color.ground.ignoresSafeArea())
        .enableInjection()
    }

    private var header: some View {
        Text("Runda \(min(card.finishedRound + 1, card.totalRounds)) z \(card.totalRounds)")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Color.ink2)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    }

    private var nextSeat: GamePlayer {
        if card.nextPlayer.compare("Grok", options: .caseInsensitive) == .orderedSame {
            return .grok
        }
        return GamePlayer(
            id: UUID(uuidString: "00000000-0000-0000-0000-0000000000ff")!,
            name: card.nextPlayer,
            kind: .human
        )
    }

    private var scoreLine: String {
        card.scores.map { "\($0.name) \($0.score)" }.joined(separator: " · ")
    }
}

#Preview("Następna runda") {
    RoundEndView(card: .cabin)
}

#Preview("Ciemny") {
    RoundEndView(card: .cabin)
        .preferredColorScheme(.dark)
}

#Preview("Teraz Ty") {
    PassTurnView(card: .cabin)
}

#Preview("Teraz Ty, ciemny") {
    PassTurnView(card: .cabin)
        .preferredColorScheme(.dark)
}

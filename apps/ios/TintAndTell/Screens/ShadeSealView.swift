import Inject
import SwiftUI

/// Closed Duo when someone else holds the shade: the card back, a sealed swatch, and their name.
struct ShadeSealView: View {
    @ObserveInjection private var inject

    var round: Int
    var totalRounds: Int
    var knower: String

    private var isGrok: Bool {
        knower.compare("Grok", options: .caseInsensitive) == .orderedSame
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            ShadeCard()
                .frame(width: 300, height: 400)
                .rotationEffect(.degrees(-4))
                .offset(x: -64, y: 96)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 0) {
                header
                    .padding(.horizontal, 24)

                Spacer(minLength: 24)

                Text("\(knower) zna\nodcień")
                    .font(.system(size: 56, weight: .heavy).width(.expanded))
                    .tracking(-1.7)
                    .foregroundStyle(Color("Ink"))
                    .padding(.horizontal, 24)

                if isGrok {
                    Text("„Mam. Będzie bolało, ale krótko.”")
                        .font(.system(size: 17))
                        .foregroundStyle(Color.ink2)
                        .padding(.top, 16)
                        .padding(.horizontal, 24)
                }

                Text("Nikt nie musi patrzeć. Rozłóż telefon, \(knower) poda podpowiedź na stole.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 8)
                    .padding(.horizontal, 24)

                HStack(spacing: 14) {
                    FoldedDuoMark()
                    Text("Rozłóż telefon na stole")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color("Ink"))
                }
                .padding(.top, 28)
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
                .accessibilityElement(children: .combine)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("Paper").ignoresSafeArea())
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Text("Runda \(round) z \(totalRounds) · podpowiada \(knower)")
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
        .padding(.top, 14)
    }
}

/// Graphite card back. The swatch is sealed, so no hue shows.
private struct ShadeCard: View {
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.cocoa)
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Color.coldSteel.opacity(scheme == .dark ? 0.45 : 0), lineWidth: 1.5)

            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.coldSteel.opacity(0.22), lineWidth: 2)
                .padding(18)

            ZStack {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color(hex: "0A0A0A"))
                    .frame(width: 120, height: 120)
                CornerBracket(armLength: 18)
                    .stroke(Color.coldSteel, style: StrokeStyle(lineWidth: 3, lineCap: .square, lineJoin: .miter))
                    .frame(width: 148, height: 148)
            }

            Circle()
                .fill(Color("Paper"))
                .frame(width: 30, height: 30)
                .overlay {
                    Circle().strokeBorder(Color.black.opacity(0.35), lineWidth: 1)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, 30)
                .padding(.trailing, 30)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.35), radius: 0, y: 2)
    }
}

#Preview("Grok zna odcień") {
    ShadeSealView(round: 5, totalRounds: 6, knower: "Grok")
}

#Preview("Ciemny") {
    ShadeSealView(round: 5, totalRounds: 6, knower: "Grok")
        .preferredColorScheme(.dark)
}

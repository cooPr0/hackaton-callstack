import SwiftUI
import TintDesign

/// Circular Liquid Glass control that opens the pause sheet.
struct PauseButton: View {
    @Environment(\.openPause) private var openPause

    var body: some View {
        Button(action: openPause) {
            Image(systemName: "pause.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.ink)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .accessibilityLabel("Pauza")
    }
}

private struct OpenPauseKey: EnvironmentKey {
    static let defaultValue: @MainActor () -> Void = {}
}

extension EnvironmentValues {
    var openPause: @MainActor () -> Void {
        get { self[OpenPauseKey.self] }
        set { self[OpenPauseKey.self] = newValue }
    }
}

/// System sheet over the closed phone: resume, the clue rules, pass the role, or end the party.
struct PauseSheet: View {
    var round: Int
    var totalRounds: Int
    var scoreLine: String
    var onResume: () -> Void
    var onPassRole: () -> Void
    var onEnd: () -> Void

    @State private var page = Page.menu

    private enum Page {
        case menu
        case rules
        case confirmEnd
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
            switch page {
            case .menu:
                PauseMenu(
                    round: round,
                    totalRounds: totalRounds,
                    scoreLine: scoreLine,
                    onResume: onResume,
                    onRules: { page = .rules },
                    onPassRole: onPassRole,
                    onEnd: { page = .confirmEnd }
                )
            case .rules:
                RulesPage(onBack: { page = .menu })
            case .confirmEnd:
                EndConfirm(onCancel: { page = .menu }, onEnd: onEnd)
            }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct PauseMenu: View {
    var round: Int
    var totalRounds: Int
    var scoreLine: String
    var onResume: () -> Void
    var onRules: () -> Void
    var onPassRole: () -> Void
    var onEnd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Pauza")
                .font(.system(size: 34, weight: .heavy).width(.expanded))
                .foregroundStyle(Color.ink)
            Text("Runda \(round) z \(totalRounds) · \(scoreLine)")
                .font(.system(size: 15))
                .foregroundStyle(Color.ink2)
                .padding(.top, 6)
                .padding(.bottom, 10)

            PauseRow(title: "Wznów grę", action: onResume)
            PauseRow(title: "Zasady podpowiedzi", action: onRules)
            PauseRow(title: "Przekaż rolę dalej", action: onPassRole)
            PauseRow(title: "Zakończ partię", danger: true, action: onEnd)
        }
    }
}

private struct RulesPage: View {
    var onBack: () -> Void

    private let items = [
        "Pierwsza podpowiedź to jedno słowo, druga to najwyżej dwa.",
        "Nie wolno używać nazw kolorów ani mówić, gdzie jest odcień.",
        "Skojarzenia są mile widziane: jedzenie, miejsca, wspomnienia.",
        "Punkty: 3 za trafienie, 2 za kratkę obok, 1 za dwie kratki dalej.",
        "Podpowiadający dostaje punkt za każdy kamień w domu (3 × 3).",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Zasady podpowiedzi")
                .font(.system(size: 34, weight: .heavy).width(.expanded))
                .foregroundStyle(Color.ink)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .padding(.bottom, 6)
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("\(index + 1)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color.ink3)
                    Text(item)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            PauseRow(title: "Wróć", action: onBack)
                .padding(.top, 8)
        }
    }
}

private struct EndConfirm: View {
    @Environment(\.colorScheme) private var scheme
    var onCancel: () -> Void
    var onEnd: () -> Void

    private var danger: Color {
        scheme == .dark ? Color(hex: "F2626B") : Color(hex: "B3261E")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Na pewno zakończyć?")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(danger)
            HStack(spacing: 10) {
                Button("Anuluj", action: onCancel)
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                Button("Tak, zakończ", action: onEnd)
                    .buttonStyle(.glass)
                    .tint(danger)
                    .frame(maxWidth: .infinity)
            }
            .controlSize(.large)
        }
        .padding(.top, 12)
    }
}

private struct PauseRow: View {
    @Environment(\.colorScheme) private var scheme
    var title: String
    var danger: Bool = false
    var action: () -> Void

    private var dangerColor: Color {
        scheme == .dark ? Color(hex: "F2626B") : Color(hex: "B3261E")
    }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: action) {
                Text(title)
                    .font(.system(size: 17))
                    .foregroundStyle(danger ? dangerColor : Color.ink)
                    .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            }
            .buttonStyle(.plain)
            if !danger {
                Color.rule.frame(height: 1)
            }
        }
    }
}

#Preview("Pauza") {
    Color.ground
        .ignoresSafeArea()
        .sheet(isPresented: .constant(true)) {
            PauseSheet(
                round: 3,
                totalRounds: 6,
                scoreLine: "Ola 7, Grok 6, Kuba 5",
                onResume: {},
                onPassRole: {},
                onEnd: {}
            )
            .presentationDetents([.height(380)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(38)
        }
}

#Preview("Pauza, ciemny") {
    Color.ground
        .ignoresSafeArea()
        .sheet(isPresented: .constant(true)) {
            PauseSheet(
                round: 3,
                totalRounds: 6,
                scoreLine: "Ola 7, Grok 6, Kuba 5",
                onResume: {},
                onPassRole: {},
                onEnd: {}
            )
            .presentationDetents([.height(380)])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(38)
        }
        .preferredColorScheme(.dark)
}

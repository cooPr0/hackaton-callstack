import Inject
import SwiftUI

/// Who gives the clue, and who is left to guess.
enum PartyMode: String, CaseIterable, Identifiable {
    case stol
    case ty
    case grok

    var id: String { rawValue }

    var title: String {
        switch self {
        case .stol: "Stół"
        case .ty: "Ty podpowiadasz"
        case .grok: "Grok podpowiada"
        }
    }

    var subtitle: String {
        switch self {
        case .stol: "Podpowiadacie po kolei"
        case .ty: "Grok tylko zgaduje"
        case .grok: "Ty tylko zgadujesz"
        }
    }

    var cropX: Int {
        switch self {
        case .stol: 4
        case .ty: 15
        case .grok: 21
        }
    }

    var cropY: Int {
        switch self {
        case .stol: 3
        case .ty: 6
        case .grok: 2
        }
    }
}

struct GamePlayer: Identifiable, Equatable {
    enum Kind: Equatable {
        case human
        case grok
    }

    let id: UUID
    var name: String
    var kind: Kind

    var initial: String {
        String(name.prefix(1)).uppercased()
    }

    static let grok = GamePlayer(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!,
        name: "Grok",
        kind: .grok
    )

    static let openingTable: [GamePlayer] = [
        GamePlayer(id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!, name: "Kuba", kind: .human),
        GamePlayer(id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!, name: "Ola", kind: .human),
        .grok,
    ]
}

/// Closed-phone setup: pick how the table plays, who sits down, then draw a shade.
struct NewGameView: View {
    @ObserveInjection private var inject
    @State private var mode: PartyMode
    @State private var players: [GamePlayer]
    @State private var isAdding = false
    @State private var draftName = ""
    @State private var drawCount = 0

    var onDrawShade: (PartyMode, [GamePlayer]) -> Void

    init(
        mode: PartyMode = .stol,
        players: [GamePlayer] = GamePlayer.openingTable,
        onDrawShade: @escaping (PartyMode, [GamePlayer]) -> Void = { _, _ in }
    ) {
        _mode = State(initialValue: mode)
        _players = State(initialValue: players)
        self.onDrawShade = onDrawShade
    }

    var body: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        header
                        title
                        PalettePatch(x0: 0, y0: 2, columns: 24, rows: 3, grout: 3, corner: 2)
                            .frame(height: 52)
                            .padding(.top, 20)
                            .accessibilityLabel("Pasek odcieni planszy")
                        modeTiles
                            .padding(.top, 24)
                        Spacer(minLength: 28)
                        playerRow
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 14)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height - 96, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)

                drawButton
                    .padding(.horizontal, 24)
                    .padding(.top, 28)
                    .padding(.bottom, 14)
            }
        }
        .background(Color("Paper").ignoresSafeArea())
        .tint(Color("Ink"))
        .sensoryFeedback(.selection, trigger: mode)
        .sensoryFeedback(.impact(weight: .medium), trigger: drawCount)
        .alert("Dodaj gracza", isPresented: $isAdding) {
            TextField("Imię", text: $draftName)
            Button("Dodaj", action: addPlayer)
            Button("Anuluj", role: .cancel) { draftName = "" }
        } message: {
            Text("Przy stole siada do sześciu osób, w tym Grok.")
        }
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center) {
            CabinMark()
            Spacer(minLength: 12)
            Text("\(PartyCopy.playerCount(players.count)) · telefon złożony")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.ink2)
                .lineLimit(1)
        }
        .frame(minHeight: 44)
    }

    private var title: some View {
        VStack(alignment: .leading, spacing: -6) {
            Text("Nowa")
            Text("partia")
        }
        .font(.system(size: 56, weight: .heavy).width(.expanded))
        .tracking(-1.7)
        .foregroundStyle(Color("Ink"))
        .padding(.top, 20)
        .accessibilityElement(children: .combine)
    }

    private var modeTiles: some View {
        VStack(spacing: 10) {
            ForEach(PartyMode.allCases) { item in
                Button {
                    mode = item
                } label: {
                    ModeTile(mode: item, players: players, isSelected: mode == item)
                }
                .buttonStyle(.plain)
            }
        }
        .animation(.smooth(duration: 0.25), value: mode)
    }

    private var playerRow: some View {
        HStack(alignment: .bottom, spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 18) {
                    ForEach(orderedPlayers) { player in
                        playerChip(player)
                    }
                    if players.count < 6 {
                        addChip
                    }
                }
            }
            .scrollClipDisabled()

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 0) {
                Text("6 rund")
                Text("ok. 20 min")
            }
            .font(.system(size: 15))
            .foregroundStyle(Color.ink2)
            .multilineTextAlignment(.trailing)
        }
    }

    private var drawButton: some View {
        Button {
            drawCount += 1
            onDrawShade(mode, orderedPlayers)
        } label: {
            Text("Losuj odcień dla \(PartyCopy.dla(shadeOwner))")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color("Paper"))
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color("Ink"), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityHint("Zaczyna partię od sekretnego odcienia")
    }

    private var addChip: some View {
        Button {
            draftName = ""
            isAdding = true
        } label: {
            VStack(spacing: 8) {
                Circle()
                    .strokeBorder(Color.ink3, style: StrokeStyle(lineWidth: 2, dash: [3.5, 3.5]))
                    .frame(width: 44, height: 44)
                    .overlay {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color.ink2)
                    }
                Text("Dodaj")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink2)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Dodaj gracza")
    }

    private func playerChip(_ player: GamePlayer) -> some View {
        let chip = VStack(spacing: 8) {
            SeatStone(player: player, size: 44, hole: Color("Paper"))
            Text(player.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.ink2)
                .lineLimit(1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(player.kind == .grok ? "Grok" : player.name)

        return Group {
            if player.kind == .human, humanCount > 1 {
                chip.contextMenu {
                    Button("Usuń", role: .destructive) {
                        players.removeAll { $0.id == player.id }
                    }
                }
            } else {
                chip
            }
        }
    }

    private var orderedPlayers: [GamePlayer] {
        players.filter { $0.kind == .human } + players.filter { $0.kind == .grok }
    }

    private var humanCount: Int {
        players.filter { $0.kind == .human }.count
    }

    /// The seat the secret shade belongs to. At the table and when you clue, that is the first human. When Grok clues, it is Grok.
    private var shadeOwner: String {
        switch mode {
        case .grok:
            "Grok"
        case .stol, .ty:
            players.first { $0.kind == .human }?.name ?? "Gracz"
        }
    }

    private func addPlayer() {
        let trimmed = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        draftName = ""
        guard !trimmed.isEmpty, players.count < 6 else { return }
        let name = String(trimmed.prefix(16))
        let player = GamePlayer(id: UUID(), name: name, kind: .human)
        if let grok = players.firstIndex(where: { $0.kind == .grok }) {
            players.insert(player, at: grok)
        } else {
            players.append(player)
        }
    }
}

private struct ModeTile: View {
    var mode: PartyMode
    var players: [GamePlayer]
    var isSelected: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(mode.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(isSelected ? Color("Paper") : Color("Ink"))
                Text(mode.subtitle)
                    .font(.system(size: 15))
                    .foregroundStyle(isSelected ? Color("Paper").opacity(0.72) : Color.ink2)
                    .padding(.top, 2)
                seatRow
                    .padding(.top, 8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            PalettePatch(x0: mode.cropX, y0: mode.cropY, columns: 2, rows: 2, grout: 3, corner: 3)
                .frame(width: 44, height: 44)
        }
        .padding(EdgeInsets(top: 16, leading: 16, bottom: 14, trailing: 16))
        .frame(minHeight: 100, alignment: .bottom)
        .background(isSelected ? Color("Ink") : Color.clear, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(isSelected ? Color("Ink") : Color.ink2, lineWidth: 1)
        }
        .overlay(alignment: .topTrailing) {
            if isSelected {
                CheckStroke()
                    .stroke(
                        Color("Paper"),
                        style: StrokeStyle(lineWidth: 2.4, lineCap: .round, lineJoin: .round)
                    )
                    .frame(width: 18, height: 14)
                    .padding(.top, 18)
                    .padding(.trailing, 18)
                    .accessibilityHidden(true)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityLabel("\(mode.title). \(mode.subtitle)")
    }

    /// Light hole on the cocoa stone, so Grok stays readable on the filled tile.
    private var grokHole: Color {
        isSelected ? Color.coldSteel : Color("Paper")
    }

    private var seatRow: some View {
        HStack(spacing: 6) {
            switch mode {
            case .stol:
                ForEach(players) { player in
                    SeatStone(player: player, size: 26, hole: grokHole, onFilledTile: isSelected && player.kind == .grok)
                }
            case .ty:
                if let human = players.first(where: { $0.kind == .human }) {
                    SeatStone(player: human, size: 26, hole: Color("Paper"))
                    FlowArrow()
                        .foregroundStyle(isSelected ? Color("Paper").opacity(0.72) : Color.ink2)
                    SeatStone(player: .grok, size: 26, hole: grokHole, onFilledTile: isSelected)
                }
            case .grok:
                SeatStone(player: .grok, size: 26, hole: grokHole, onFilledTile: isSelected)
                FlowArrow()
                    .foregroundStyle(isSelected ? Color("Paper").opacity(0.72) : Color.ink2)
                if let human = players.first(where: { $0.kind == .human }) {
                    SeatStone(player: human, size: 26, hole: Color("Paper"))
                }
            }
        }
    }
}

struct SeatStone: View {
    var player: GamePlayer
    var size: CGFloat
    var hole: Color
    var onFilledTile: Bool = false

    @Environment(\.colorScheme) private var scheme

    var body: some View {
        ZStack {
            if player.kind == .grok {
                // On a Cocoa tile the stone would vanish, so it steps to black and keeps a light hole.
                Circle().fill(onFilledTile ? Color.black : Color.cocoa)
                Circle()
                    .fill(hole)
                    .frame(width: size * 0.30, height: size * 0.30)
                if scheme == .dark || onFilledTile {
                    Circle().strokeBorder(Color.coldSteel, lineWidth: 1.5)
                }
            } else {
                Circle().fill(scheme == .dark ? Color.coldSteel : Color.white)
                Circle().strokeBorder(Color.cocoa, lineWidth: 1.5)
                Text(player.initial)
                    .font(.system(size: size * 0.39, weight: .bold))
                    .foregroundStyle(Color.cocoa)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(width: size, height: size)
        .shadow(color: .black.opacity(player.kind == .human ? 0.28 : 0), radius: 0, y: 1.5)
        .accessibilityHidden(true)
    }
}

private struct FlowArrow: View {
    var body: some View {
        Image(systemName: "arrow.right")
            .font(.system(size: 11, weight: .semibold))
            .frame(width: 14, height: 10)
            .accessibilityHidden(true)
    }
}

private struct CheckStroke: Shape {
    nonisolated func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY + 1))
        path.addLine(to: CGPoint(x: rect.width * 0.38, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return path
    }
}

private struct CabinMark: View {
    var side: CGFloat = 34

    var body: some View {
        Canvas { context, size in
            let scale = size.width / 256
            func polygon(_ points: [CGFloat]) -> Path {
                var path = Path()
                var cursor = 0
                var first = true
                while cursor + 1 < points.count {
                    let point = CGPoint(x: points[cursor] * scale, y: points[cursor + 1] * scale)
                    if first {
                        path.move(to: point)
                        first = false
                    } else {
                        path.addLine(to: point)
                    }
                    cursor += 2
                }
                path.closeSubpath()
                return path
            }
            context.fill(
                polygon([24, 40, 120, 40, 120, 84, 94, 84, 94, 216, 50, 216, 50, 84, 24, 84]),
                with: .color(.cabinGold)
            )
            context.fill(
                polygon([232, 216, 136, 216, 136, 172, 162, 172, 162, 40, 206, 40, 206, 172, 232, 172]),
                with: .color(Color("Ink"))
            )
        }
        .frame(width: side, height: side)
        .accessibilityLabel("Tint & Tell")
    }
}

enum PartyCopy {
    static func playerCount(_ count: Int) -> String {
        let mod10 = count % 10
        let mod100 = count % 100
        if count == 1 { return "1 gracz" }
        if (2...4).contains(mod10), !(12...14).contains(mod100) {
            return "\(count) gracze"
        }
        return "\(count) graczy"
    }

    /// Best-effort genitive so the button reads „dla Kuby”, „dla Oli”, „dla Groka”.
    static func dla(_ name: String) -> String {
        if name.compare("grok", options: .caseInsensitive) == .orderedSame {
            return prefixed(name, "Groka")
        }
        let lower = name.lowercased()
        if lower.hasSuffix("ja"), name.count > 2 {
            return String(name.dropLast(2)) + "i"
        }
        if lower.hasSuffix("ia"), name.count > 2 {
            return String(name.dropLast(1))
        }
        if lower.hasSuffix("a"), name.count > 1 {
            let stem = String(name.dropLast())
            let soft = ["ś", "ź", "ć", "ń", "j", "l", "dz", "dź", "dż", "rz", "cz", "sz"]
            if soft.contains(where: { stem.lowercased().hasSuffix($0) }) {
                return stem + "i"
            }
            return stem + "y"
        }
        let vowels = Set("aeiouyąęó")
        if let last = lower.last, !vowels.contains(last) {
            return name + "a"
        }
        return name
    }

    /// „Podaj Oli”, „Podaj Kubie”, „Podaj Grokowi”.
    static func podaj(_ name: String) -> String {
        if name.compare("grok", options: .caseInsensitive) == .orderedSame {
            return prefixed(name, "Grokowi")
        }
        let lower = name.lowercased()
        if lower.hasSuffix("ia"), name.count > 2 {
            return String(name.dropLast(1))
        }
        if lower.hasSuffix("ja"), name.count > 2 {
            return String(name.dropLast(2)) + "i"
        }
        if lower.hasSuffix("a"), name.count > 1 {
            let stem = String(name.dropLast())
            let soft = ["ś", "ź", "ć", "ń", "j", "l", "dz", "dź", "dż", "rz", "cz", "sz"]
            if soft.contains(where: { stem.lowercased().hasSuffix($0) }) {
                return stem + "i"
            }
            return stem + "ie"
        }
        return name
    }

    /// „Jestem Olą”, „Jestem Kubą”, „Jestem Grokiem”.
    static func jestem(_ name: String) -> String {
        if name.compare("grok", options: .caseInsensitive) == .orderedSame {
            return prefixed(name, "Grokiem")
        }
        if name.lowercased().hasSuffix("a"), name.count > 1 {
            return String(name.dropLast()) + "ą"
        }
        return name
    }

    static func inHouse(_ count: Int) -> String {
        switch count {
        case 0: return "Żaden kamień w domu"
        case 1: return "1 kamień w domu"
        default:
            let mod10 = count % 10
            let mod100 = count % 100
            if (2...4).contains(mod10), !(12...14).contains(mod100) {
                return "\(count) kamienie w domu"
            }
            return "\(count) kamieni w domu"
        }
    }

    static func handoff(next: String, guessers: [String]) -> String {
        let others = joined(guessers)
        if next == "Ola" {
            return "Teraz ona dostaje odcień. \(others) zgadują."
        }
        return "Teraz \(next) dostaje odcień. \(others) zgadują."
    }

    private static func joined(_ names: [String]) -> String {
        switch names.count {
        case 0: ""
        case 1: names[0]
        case 2: "\(names[0]) i \(names[1])"
        default:
            "\(names.dropLast().joined(separator: ", ")) i \(names.last ?? "")"
        }
    }

    private static func prefixed(_ original: String, _ declined: String) -> String {
        guard let first = original.first, first.isLowercase else { return declined }
        return declined.prefix(1).lowercased() + declined.dropFirst()
    }
}

#Preview("Stół") {
    NewGameView()
}

#Preview("Ty podpowiadasz") {
    NewGameView(mode: .ty)
}

#Preview("Grok podpowiada") {
    NewGameView(mode: .grok)
}

#Preview("Ciemny") {
    NewGameView()
        .preferredColorScheme(.dark)
}

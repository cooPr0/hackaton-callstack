import Inject
import SwiftUI
import TintDesign

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
    @State private var drawCount = 0

    var onDrawShade: (PartyMode, [GamePlayer]) -> Void

    init(
        mode: PartyMode = .stol,
        players: [GamePlayer] = GamePlayer.openingTable,
        onDrawShade: @escaping (PartyMode, [GamePlayer]) -> Void = { _, _ in }
    ) {
        _mode = State(initialValue: mode)
        var seated = players.filter { $0.kind == .human }
        seated.append(.grok)
        _players = State(initialValue: seated)
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
        .background(Color.ground.ignoresSafeArea())
        .tint(Color.ink)
        .sensoryFeedback(.selection, trigger: mode)
        .sensoryFeedback(.impact(weight: .medium), trigger: drawCount)
        .enableInjection()
    }

    private var header: some View {
        HStack(alignment: .center) {
            Image.logo
                .resizable()
                .scaledToFit()
                .frame(width: 34, height: 34)
                .accessibilityLabel("Tint & Tell")
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
        .foregroundStyle(Color.ink)
        .padding(.top, 20)
        .accessibilityElement(children: .combine)
    }

    private var modeTiles: some View {
        VStack(spacing: 10) {
            ForEach(PartyMode.allCases) { item in
                Button {
                    mode = item
                } label: {
                    ModeTile(mode: item, isSelected: mode == item)
                }
                .buttonStyle(.plain)
            }
        }
        .animation(.smooth(duration: 0.25), value: mode)
    }

    private var playerRow: some View {
        HStack(alignment: .bottom, spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 10) {
                    ForEach(orderedPlayers) { player in
                        playerChip(player)
                    }
                    if humanCount < Self.maxHumans {
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
            onDrawShade(mode, seatedPlayers)
        } label: {
            Text(shadeOwner.isEmpty ? "Losuj odcień · zaczyna …" : "Losuj odcień · zaczyna \(shadeOwner)")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.ground)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color.ink, in: Capsule())
        }
        .buttonStyle(.plain)
        .disabled(!canDraw)
        .opacity(canDraw ? 1 : 0.38)
        .accessibilityHint("Zaczyna partię od sekretnego odcienia")
    }

    private var addChip: some View {
        Button(action: addPlayer) {
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
        VStack(spacing: 4) {
            ZStack(alignment: .topTrailing) {
                SeatStone(player: player, size: 44, hole: Color.ground)
                if player.kind == .human, humanCount > 1 {
                    Button {
                        players.removeAll { $0.id == player.id }
                    } label: {
                        Text("×")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.ink2)
                            .frame(width: 18, height: 18)
                            .background(Color.ground, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .offset(x: 4, y: -4)
                    .accessibilityLabel("Usuń: \(player.name)")
                }
            }
            if player.kind == .grok {
                Text("Grok")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.ink2)
            } else {
                TextField("Imię", text: nameBinding(for: player.id))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.ink2)
                    .multilineTextAlignment(.center)
                    .textFieldStyle(.plain)
                    .textInputAutocapitalization(.words)
                    .submitLabel(.done)
                    .frame(width: 54)
                    .accessibilityLabel("Imię gracza")
            }
        }
        .frame(width: 54)
    }

    /// Humans stay in the order they were added. Grok is always the last seat, as on the web.
    private var orderedPlayers: [GamePlayer] {
        players.filter { $0.kind == .human } + [GamePlayer.grok]
    }

    /// Names ready to play: blanks become „Gracz N”, and exactly one Grok sits at the end.
    private var seatedPlayers: [GamePlayer] {
        orderedPlayers.enumerated().map { index, player in
            guard player.kind == .human else { return .grok }
            var seated = player
            let trimmed = player.name.trimmingCharacters(in: .whitespacesAndNewlines)
            let humansBefore = orderedPlayers.prefix(index).filter { $0.kind == .human }.count
            seated.name = trimmed.isEmpty ? "Gracz \(humansBefore + 1)" : String(trimmed.prefix(24))
            return seated
        }
    }

    private var humanCount: Int {
        players.filter { $0.kind == .human }.count
    }

    /// Stół needs two people besides Grok. The other modes need one.
    private var canDraw: Bool {
        if humanCount < 1 { return false }
        if mode == .stol, humanCount < 2 { return false }
        return true
    }

    /// Who draws the first shade. Grok mode starts with Grok; every other mode starts with the first person.
    private var shadeOwner: String {
        if mode == .grok { return "Grok" }
        return seatedPlayers.first { $0.kind == .human }?.name ?? ""
    }

    private func nameBinding(for id: UUID) -> Binding<String> {
        Binding(
            get: { players.first { $0.id == id }?.name ?? "" },
            set: { newValue in
                guard let index = players.firstIndex(where: { $0.id == id }) else { return }
                players[index].name = String(newValue.prefix(24))
            }
        )
    }

    private func addPlayer() {
        guard humanCount < Self.maxHumans else { return }
        let player = GamePlayer(id: UUID(), name: "Gracz \(humanCount + 1)", kind: .human)
        if let grok = players.firstIndex(where: { $0.kind == .grok }) {
            players.insert(player, at: grok)
        } else {
            players.append(player)
        }
    }

    private static let maxHumans = 5
}

private struct ModeTile: View {
    var mode: PartyMode
    var isSelected: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(mode.title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(isSelected ? Color.ground : Color.ink)
                Text(mode.subtitle)
                    .font(.system(size: 15))
                    .foregroundStyle(isSelected ? Color.ground.opacity(0.72) : Color.ink2)
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
        .background(isSelected ? Color.ink : Color.clear, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(isSelected ? Color.ink : Color.ink2, lineWidth: 1)
        }
        .overlay(alignment: .topTrailing) {
            if isSelected {
                CheckStroke()
                    .stroke(
                        Color.ground,
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
        isSelected ? Color.bone : Color.ground
    }

    /// The mode tiles illustrate the rule. They stay Kuba, Ola and Grok, like the web, whatever the list says.
    private var seatRow: some View {
        let kuba = GamePlayer.openingTable[0]
        let ola = GamePlayer.openingTable[1]
        return HStack(spacing: 6) {
            switch mode {
            case .stol:
                SeatStone(player: kuba, size: 26, hole: grokHole, onFilledTile: isSelected)
                SeatStone(player: ola, size: 26, hole: Color.ground, onFilledTile: isSelected)
                SeatStone(player: .grok, size: 26, hole: grokHole, onFilledTile: isSelected)
            case .ty:
                SeatStone(player: kuba, size: 26, hole: Color.ground, onFilledTile: isSelected)
                FlowArrow()
                    .foregroundStyle(isSelected ? Color.ground.opacity(0.72) : Color.ink2)
                SeatStone(player: .grok, size: 26, hole: grokHole, onFilledTile: isSelected)
            case .grok:
                SeatStone(player: .grok, size: 26, hole: grokHole, onFilledTile: isSelected)
                FlowArrow()
                    .foregroundStyle(isSelected ? Color.ground.opacity(0.72) : Color.ink2)
                SeatStone(player: kuba, size: 26, hole: Color.ground, onFilledTile: isSelected)
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
                    Circle().strokeBorder(Color.bone, lineWidth: 1.5)
                }
            } else {
                // A selected tile flips to cold steel in the dark, so the stone flips with it.
                let onLightTile = onFilledTile && scheme == .dark
                let mark = onLightTile ? Color.bone : Color.cocoa
                Circle().fill(onLightTile ? Color.cocoa : Color.bone)
                Circle().strokeBorder(mark, lineWidth: 1.5)
                Text(player.initial)
                    .font(.system(size: size * 0.39, weight: .bold))
                    .foregroundStyle(mark)
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

/// Polish UI copy shared with the web client. Names stay in the nominative.
enum PartyCopy {
    static func playerCount(_ count: Int) -> String {
        "\(count) \(plural(count, one: "gracz", few: "graczy", many: "graczy"))"
    }

    static func inHouse(_ count: Int) -> String {
        "\(count) \(plural(count, one: "kamień", few: "kamienie", many: "kamieni")) w domu"
    }

    static func inFrame(_ count: Int) -> String {
        if count == 0 { return "Żadnego kamienia w kadrze" }
        return "\(count) \(plural(count, one: "kamień", few: "kamienie", many: "kamieni")) w kadrze"
    }

    private static func plural(_ count: Int, one: String, few: String, many: String) -> String {
        let mod10 = count % 10
        let mod100 = count % 100
        if count == 1 { return one }
        if (2...4).contains(mod10), !(12...14).contains(mod100) { return few }
        return many
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

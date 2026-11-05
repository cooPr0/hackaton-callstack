import Inject
import SwiftUI
import TintCore
import TintDesign

/// Key from `GrokSecrets.json` in the app bundle. That file is gitignored.
enum GrokSecrets {
    static var apiKey: String {
        guard let url = Bundle.main.url(forResource: "GrokSecrets", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let file = try? JSONDecoder().decode(File.self, from: data)
        else { return "" }
        return file.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private struct File: Decodable {
        let apiKey: String

        enum CodingKeys: String, CodingKey {
            case apiKey = "XAI_API_KEY"
        }
    }
}

struct LocalTableView: View {
    @ObserveInjection var inject
    @AppStorage("tint.xai.apiKey") private var storedKey = ""
    @State private var session: LocalGameSession?
    @State private var round: RoundDefinition?
    @State private var clues: [String] = []
    @State private var stones: [RoundSecret.Cell] = []
    @State private var secret: RoundSecret?
    @State private var draft = ""
    @State private var grokLine = ""
    @State private var status = ""
    @State private var busy = false

    private var apiKey: String {
        let shipped = GrokSecrets.apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        return shipped.isEmpty ? storedKey.trimmingCharacters(in: .whitespacesAndNewlines) : shipped
    }

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                Text(title)
                    .font(.display)
                if GrokSecrets.apiKey.isEmpty {
                    SecureField("Klucz xAI", text: $storedKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                if let secret, round?.phase == .secret1 || round?.phase == .secret2 {
                    Text("Twój odcień. Jedno słowo, bez nazw kolorów.")
                        .foregroundStyle(.ink2)
                    ShadeGrid(
                        columns: 7,
                        cells: viewfinder(secret),
                        stones: stones,
                        target: nil,
                        onTap: nil
                    )
                    TextField("Podpowiedź", text: $draft)
                        .font(.system(size: 28, weight: .semibold))
                    Button("Wyślij") { Task { await submitClue() } }
                        .buttonStyle(.borderedProminent)
                        .disabled(busy || draft.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                if round?.phase.isGuess == true, round?.turnSeatId == session?.hostSeatId {
                    Text("Połóż kamień.")
                        .foregroundStyle(.ink2)
                    ShadeGrid(
                        columns: 24,
                        cells: fullBoard,
                        stones: stones,
                        target: nil,
                        onTap: { x, y in Task { await place(x: x, y: y) } }
                    )
                }
                if round?.phase == .reveal {
                    Text(clues.joined(separator: " · "))
                        .font(.system(size: 28, weight: .semibold))
                    Button("Następna runda") { Task { await advance() } }
                        .buttonStyle(.borderedProminent)
                }
                if !grokLine.isEmpty {
                    Text("Grok: „\(grokLine)”")
                        .font(.system(size: 28, weight: .semibold))
                }
                if !status.isEmpty {
                    Text(status)
                        .foregroundStyle(.ink2)
                }
                Button("Pogadaj z Grokiem") { Task { await talk() } }
                    .disabled(busy || apiKey.isEmpty)
            }
            .padding(24)
            .frame(maxWidth: 720, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ground)
        .tint(.ink)
        .task { await boot() }
        .enableInjection()
    }

    private var title: String {
        switch round?.phase {
        case .secret1, .secret2:
            secret == nil ? "Grok układa podpowiedź…" : "Twoja podpowiedź"
        case .guess1, .guess2:
            round?.turnSeatId == session?.hostSeatId ? "Twój kamień" : "Grok kładzie kamień…"
        case .reveal:
            "Odkrycie"
        case .gameOver:
            "Koniec partii"
        default:
            "Stół"
        }
    }

    private var fullBoard: [ShadeCell] {
        (0..<12).flatMap { y in (0..<24).map { x in ShadeCell(x: x, y: y) } }
    }

    private func viewfinder(_ secret: RoundSecret) -> [ShadeCell] {
        (0..<9).flatMap { row in
            (0..<7).map { column in
                ShadeCell(x: secret.window.x0 + column, y: secret.window.y0 + row)
            }
        }
    }

    private func boot() async {
        guard session == nil else { return }
        guard let opened = try? LocalGameSession.open(
            humans: ["Ola"],
            agent: "Grok",
            rounds: 2,
            seed: Int32.random(in: 1...9_999)
        ) else { return }
        session = opened
        try? await opened.start()
        await reload()
        await playAgentIfNeeded()
    }

    private func reload() async {
        guard let session else { return }
        round = await session.round
        clues = await session.clueTexts()
        stones = await session.occupied()
        secret = await session.secretForHuman(session.hostSeatId)
    }

    private func submitClue() async {
        guard let session else { return }
        busy = true
        defer { busy = false }
        do {
            try await session.submitClue(draft, by: session.hostSeatId)
            draft = ""
            await reload()
            await playAgentIfNeeded()
        } catch {
            status = "Ta podpowiedź nie przechodzi."
        }
    }

    private func place(x: Int, y: Int) async {
        guard let session, !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await session.place(x: x, y: y, by: session.hostSeatId)
            await reload()
            await playAgentIfNeeded()
        } catch {
            status = "Ta kratka jest zajęta."
        }
    }

    private func advance() async {
        guard let session else { return }
        try? await session.next()
        grokLine = ""
        await reload()
        await playAgentIfNeeded()
    }

    private func playAgentIfNeeded() async {
        guard let session, !apiKey.isEmpty else {
            if apiKey.isEmpty { status = "Wpisz klucz xAI, żeby Grok zagrał." }
            return
        }
        busy = true
        defer { busy = false }
        do {
            grokLine = try await session.playAgent(using: XAIGrokClient(apiKey: apiKey))
            status = ""
            await reload()
            if round?.turnSeatId != session.hostSeatId, round?.phase != .reveal {
                await playAgentIfNeeded()
            }
        } catch LocalPlayError.notAgentTurn {
            return
        } catch LocalPlayError.grok(.missingKey) {
            status = "Wpisz klucz xAI, żeby Grok zagrał."
        } catch {
            status = "Grok teraz nie odpowiada."
        }
    }

    private func talk() async {
        guard !apiKey.isEmpty else { return }
        busy = true
        defer { busy = false }
        do {
            _ = try await XAIGrokClient(apiKey: apiKey).voiceTicket()
            status = "Grok jest na linii."
        } catch {
            status = "Grok teraz nie dosłyszy."
        }
    }
}

private struct ShadeCell: Identifiable {
    let x: Int
    let y: Int
    var id: String { "\(x)-\(y)" }

    var color: Color {
        Color(hue: Double(x) / 24, saturation: 0.62, brightness: 0.93 - Double(y) / 18)
    }
}

private struct ShadeGrid: View {
    let columns: Int
    let cells: [ShadeCell]
    let stones: [RoundSecret.Cell]
    let target: RoundSecret.Cell?
    let onTap: ((Int, Int) -> Void)?

    var body: some View {
        let grid = Array(repeating: GridItem(.flexible(), spacing: 2), count: columns)
        LazyVGrid(columns: grid, spacing: 2) {
            ForEach(cells) { cell in
                Button {
                    onTap?(cell.x, cell.y)
                } label: {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(cell.color)
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            if stones.contains(where: { $0.x == cell.x && $0.y == cell.y }) {
                                Circle().fill(.white).padding(3)
                            }
                        }
                        .overlay {
                            if target?.x == cell.x, target?.y == cell.y {
                                RoundedRectangle(cornerRadius: 2).stroke(.white, lineWidth: 2)
                            }
                        }
                }
                .buttonStyle(.plain)
                .disabled(onTap == nil)
                .accessibilityLabel("Kratka")
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Plansza")
    }
}

#Preview {
    LocalTableView()
}

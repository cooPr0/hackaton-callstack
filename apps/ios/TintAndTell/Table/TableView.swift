import Inject
import SwiftUI
import TintDesign

/// Posture the shell already resolved. The table uses it so a debug override and the board agree.
struct TablePosture: Equatable {
    var wideOpen: Bool
    var fold: DeviceFold
}

extension DeviceFold {
    init(_ hinge: DeviceHinge?) {
        guard let hinge else {
            self = .none
            return
        }
        self = hinge.status == .closed ? .closed : .open
    }
}

/// The shared table.
///
/// Closed Duo, in a local game or an online one, asks to be opened before the board appears.
/// Online on a phone with no hinge shows the same board fitted upright.
struct TableView: View {
    var local: Bool
    /// Nil when this view should read the window and the hinge itself (previews).
    var posture: TablePosture?
    var onPlace: (Int, Int) -> Void

    @ObserveInjection var inject

    init(local: Bool = true, posture: TablePosture? = nil, onPlace: @escaping (Int, Int) -> Void) {
        self.local = local
        self.posture = posture
        self.onPlace = onPlace
    }

    var body: some View {
        Group {
            if let posture {
                TableBody(local: local, posture: posture, onPlace: onPlace)
            } else {
                MeasuredTable(local: local, onPlace: onPlace)
            }
        }
        .enableInjection()
    }
}

/// Reads the window and the hinge when no posture is passed in.
private struct MeasuredTable: View {
    var local: Bool
    var onPlace: (Int, Int) -> Void

    @State private var wideOpen = false
    @State private var fold = DeviceFold.none

    var body: some View {
        TableBody(
            local: local,
            posture: TablePosture(wideOpen: wideOpen, fold: fold),
            onPlace: onPlace
        )
        .onGeometryChange(for: Bool.self) { proxy in
            isWideOpenTable(size: proxy.size)
        } action: { wideOpen = $0 }
        .onHingeChange { _, context in
            fold = DeviceFold(context.hinge)
        }
    }
}

private struct TableBody: View {
    var local: Bool
    var posture: TablePosture
    var onPlace: (Int, Int) -> Void

    private var surface: TableSurface {
        tableSurface(
            local: local,
            moment: .playing,
            wideOpen: posture.wideOpen,
            fold: posture.fold
        )
    }

    var body: some View {
        Group {
            switch surface {
            case .askToOpen:
                OpenTablePrompt()
            case .board(let portrait):
                BoardStage(portrait: portrait, onPlace: onPlace)
            }
        }
        .background(Color.ground)
        .animation(.smooth(duration: 0.35), value: surface)
    }
}

/// The 24 × 12 board. Portrait turns it so a closed online phone can still reach every cell.
private struct BoardStage: View {
    var portrait: Bool
    var onPlace: (Int, Int) -> Void

    var body: some View {
        GeometryReader { proxy in
            let boardSize = portrait
                ? CGSize(width: proxy.size.height, height: proxy.size.width)
                : proxy.size
            let division: CGRect? = portrait
                ? nil
                : proxy.reservedRegions(kind: .division, options: .includeInactive).first?.frame
            if let geometry = BoardGeometry.make(in: boardSize, division: division) {
                BoardView(geometry: geometry, onPlace: onPlace)
                    .frame(width: boardSize.width, height: boardSize.height)
                    .rotationEffect(portrait ? .degrees(90) : .zero)
                    .frame(width: proxy.size.width, height: proxy.size.height)
            }
        }
    }
}

/// Closed Duo, or a local phone that is not yet the table. The board stays off this screen.
struct OpenTablePrompt: View {
    @ObserveInjection private var inject

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Spacer(minLength: 0)
                PauseButton()
            }
            .frame(minHeight: 44)

            Spacer(minLength: 24)

            Text("Rozłóż telefon na stole")
                .font(.system(size: 44, weight: .heavy).width(.expanded))
                .tracking(-1.2)
                .foregroundStyle(Color.ink)
                .fixedSize(horizontal: false, vertical: true)

            Text("Wszyscy patrzą na planszę.")
                .font(.system(size: 17))
                .foregroundStyle(Color.ink2)
                .padding(.top, 16)

            Spacer(minLength: 24)

            HStack(spacing: 14) {
                FoldedDuoMark()
                Text("Rozłóż telefon na stole")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.ink)
            }
            .padding(.bottom, 20)
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .enableInjection()
    }
}

/// Local game, phone open while the shade is still private.
struct FoldPrompt: View {
    @ObserveInjection private var inject
    var name: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Spacer(minLength: 0)
                PauseButton()
            }
            .frame(minHeight: 44)

            Spacer(minLength: 24)

            Text("\(name), złóż telefon")
                .font(.system(size: 44, weight: .heavy).width(.expanded))
                .tracking(-1.2)
                .foregroundStyle(Color.ink)
                .fixedSize(horizontal: false, vertical: true)

            Text("Odcień jest tylko dla Ciebie.")
                .font(.system(size: 17))
                .foregroundStyle(Color.ink2)
                .padding(.top, 16)

            Spacer(minLength: 24)

            HStack(spacing: 14) {
                FoldedDuoMark()
                Text("Złóż telefon")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.ink)
            }
            .padding(.bottom, 20)
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.ground.ignoresSafeArea())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(name), złóż telefon")
        .enableInjection()
    }
}

#Preview("Stół złożony") {
    TableView(local: true, posture: TablePosture(wideOpen: false, fold: .closed)) { _, _ in }
}

#Preview("Online, telefon") {
    TableView(local: false, posture: TablePosture(wideOpen: false, fold: .none)) { _, _ in }
}

#Preview("Stół otwarty") {
    TableView(local: true, posture: TablePosture(wideOpen: true, fold: .open)) { _, _ in }
}

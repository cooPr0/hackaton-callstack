import Inject
import SwiftUI
import TintDesign
import TintKit

/// The seat this phone claimed. The shade stays off this screen.
struct OnlineRoomView: View {
    @ObserveInjection var inject

    var session: RoomSession
    var onLeave: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: onLeave) {
                    Text(.joinLeave)
                        .font(.body.weight(.semibold))
                }
                .buttonStyle(.plain)
                Spacer(minLength: 12)
                Text(verbatim: session.code)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Color.ink)
            }
            .padding(.horizontal, 24)
            .frame(minHeight: 44)

            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color.ground.ignoresSafeArea())
        .tint(Color.ink)
        .enableInjection()
    }

    @ViewBuilder
    private var content: some View {
        if let view = session.playerView {
            switch view.phase {
            case .guess1, .guess2:
                TableView { x, y in
                    Task { await session.place(x: x, y: y) }
                }
            case .lobby:
                Text(.joinWaiting)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, 24)
            default:
                Text(.joinSeated)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.ink)
                    .padding(.horizontal, 24)
            }
        } else if session.connected {
            Text(.joinSeated)
                .font(.title2.weight(.semibold))
                .foregroundStyle(Color.ink)
        } else {
            ProgressView()
                .tint(Color.ink)
        }
    }
}

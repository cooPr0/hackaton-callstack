import Inject
import SwiftUI
import TintDesign

struct ContentView: View {
    @ObserveInjection var inject

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                Image.lockup
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 320)
                    .accessibilityLabel(Text(.appName))
                Text(.appTagline)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.ink2)
                    .frame(maxWidth: 420)
                NavigationLink("Graj z Grokiem") {
                    LocalTableView()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.ground)
            .tint(.ink)
        }
        .enableInjection()
    }
}

#Preview {
    ContentView()
}

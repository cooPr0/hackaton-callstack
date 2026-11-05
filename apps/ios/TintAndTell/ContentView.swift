import Inject
import SwiftUI

struct ContentView: View {
    @ObserveInjection var inject

    var body: some View {
        VStack(spacing: 12) {
            Text("Tint & Tell")
                .font(.largeTitle.weight(.semibold))
                .foregroundStyle(Color("Ink"))
            Text("Złożony telefon trzyma sekret, rozłożony staje się stołem.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(Color("Ink").opacity(0.72))
                .frame(maxWidth: 420)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("Paper"))
        .enableInjection()
    }
}

#Preview {
    ContentView()
}

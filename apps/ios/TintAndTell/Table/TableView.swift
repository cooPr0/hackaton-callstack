import Inject
import SwiftUI
import TintDesign

/// The open-phone table: the board in whatever space this window has.
///
/// The seam between the halves follows a division reserved region, including an
/// inactive one, so a flat Duo still centers the wider grout on the fold.
/// A window with no division region gets an even grid.
struct TableView: View {
    var onPlace: (Int, Int) -> Void

    @ObserveInjection var inject

    init(onPlace: @escaping (Int, Int) -> Void) {
        self.onPlace = onPlace
    }

    var body: some View {
        GeometryReader { proxy in
            let division = proxy
                .reservedRegions(kind: .division, options: .includeInactive)
                .first?
                .frame
            if let geometry = BoardGeometry.make(in: proxy.size, division: division) {
                BoardView(geometry: geometry, onPlace: onPlace)
            }
        }
        .background(Color.ground)
        .enableInjection()
    }
}

#Preview("Stół") {
    TableView { _, _ in }
}

import Inject
import SwiftUI

/// The 288 cells. Colors come from the shared palette; names and coordinates stay off the table.
struct BoardView: View {
    var geometry: BoardGeometry
    var onPlace: (Int, Int) -> Void

    @ObserveInjection var inject

    var body: some View {
        Canvas { context, _ in
            let radius = geometry.cell * 0.18
            for row in 0..<BoardGeometry.rows {
                for column in 0..<BoardGeometry.columns {
                    let path = Path(
                        roundedRect: geometry.rect(column: column, row: row),
                        cornerRadius: radius
                    )
                    context.fill(path, with: .color(BoardPalette.color(x: column, y: row)))
                }
            }
        }
        .contentShape(Rectangle())
        .gesture(
            SpatialTapGesture()
                .onEnded { value in
                    guard let cell = geometry.cell(at: value.location) else { return }
                    onPlace(cell.x, cell.y)
                }
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Plansza")
        .enableInjection()
    }
}

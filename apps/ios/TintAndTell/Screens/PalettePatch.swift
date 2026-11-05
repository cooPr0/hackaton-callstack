import SwiftUI
import UIKit

/// Row-major hexes from `shared/palette.json` (24 × 12). The setup screen only
/// paints crops of the board; the game never reads coordinates out loud.
enum BoardPalette {
    static let columns = 24
    static let rows = 12
    static let hexes: [String] = [
        "#ffc8c6", "#ffc9bb", "#ffcbae", "#ffcd9d", "#ffcf7d", "#fdd500", "#e0e100", "#b7ef09",
        "#7ef962", "#1cff96", "#00fbc6", "#00f8e5", "#00f4fe", "#88e8ff", "#a5e1ff", "#b5ddff",
        "#c1d9ff", "#ccd5ff", "#d6d1ff", "#e2ccff", "#f4c4ff", "#ffc1f0", "#ffc4de", "#ffc6d1",
        "#ffafae", "#ffb29e", "#ffb48a", "#ffb66d", "#ffba24", "#ebc500", "#d0d000", "#a9dd00",
        "#6ee850", "#00ed8a", "#00e9b7", "#00e6d4", "#00e2ec", "#34deff", "#7ad5ff", "#95ceff",
        "#a8c9ff", "#b7c4ff", "#c6beff", "#d7b6ff", "#efaaff", "#ffa4eb", "#ffa9d2", "#ffadbf",
        "#ff9596", "#ff987e", "#ff9b61", "#ff9e25", "#edaa00", "#d8b500", "#c0c000", "#9ccc00",
        "#5dd83d", "#00db7f", "#00d7a9", "#00d4c3", "#00d1d9", "#00cdef", "#3ec7ff", "#73c0ff",
        "#8eb9ff", "#a3b2ff", "#b7abff", "#cda0ff", "#ea8eff", "#ff84e7", "#ff8dc6", "#ff92ac",
        "#ff787d", "#ff7c5c", "#ff8025", "#ed8f00", "#da9c00", "#c6a600", "#b0b000", "#8ebb00",
        "#4bc727", "#00c874", "#00c59a", "#00c2b3", "#00bfc7", "#00bcdb", "#00b8f2", "#49b0ff",
        "#74a8ff", "#90a0ff", "#a896ff", "#c289ff", "#e371fc", "#f867de", "#ff6bba", "#ff739a",
        "#ff5462", "#ff5a30", "#ee7000", "#d98200", "#c78e00", "#b59700", "#a0a000", "#81aa00",
        "#38b700", "#00b769", "#00b48c", "#00b1a3", "#00aeb6", "#00abc8", "#00a8dd", "#00a1fb",
        "#5897ff", "#7d8dff", "#9a81ff", "#b86fff", "#d261ec", "#e657ce", "#f64fac", "#ff4c87",
        "#f3384f", "#f24107", "#d76500", "#c47500", "#b48000", "#a38900", "#909100", "#759a00",
        "#32a600", "#00a55e", "#00a27f", "#00a093", "#009ea4", "#009bb5", "#0097c8", "#0091e4",
        "#3b85ff", "#6b79ff", "#8d6aff", "#aa5bf2", "#c250db", "#d546be", "#e43d9d", "#ee3779",
        "#e12041", "#da3800", "#c15a00", "#b06900", "#a17200", "#927a00", "#818200", "#688a00",
        "#2c9500", "#009454", "#009171", "#008f84", "#008d93", "#008ba2", "#0088b3", "#0082cc",
        "#1a72fb", "#5c64fb", "#8057f2", "#9b4be1", "#b23fca", "#c434ae", "#d2288e", "#dc206a",
        "#cd0034", "#c23100", "#ac4f00", "#9c5c00", "#8f6500", "#826c00", "#727300", "#5c7a00",
        "#268400", "#00834a", "#008164", "#007f75", "#007d82", "#007b90", "#00789f", "#0073b6",
        "#0062e9", "#5054e9", "#7247e1", "#8c3ad1", "#a22dba", "#b31e9e", "#c1097f", "#c8005d",
        "#b4002d", "#ab2900", "#974400", "#895000", "#7d5800", "#725e00", "#646400", "#506b00",
        "#207300", "#007340", "#007157", "#006f66", "#006d72", "#006b7e", "#00698c", "#0064a0",
        "#0055cd", "#4543d8", "#6535d0", "#7e27c0", "#9216aa", "#a2008e", "#aa006f", "#b00051",
        "#9c0026", "#942300", "#823a00", "#764500", "#6c4b00", "#625100", "#565600", "#445c00",
        "#1a6300", "#006336", "#00614b", "#006058", "#005e62", "#005c6d", "#005a79", "#00568a",
        "#0049b2", "#3a31c7", "#5921bf", "#700caf", "#810097", "#8c007b", "#930060", "#990045",
        "#85001e", "#7d1c00", "#6e3000", "#643900", "#5b3f00", "#524400", "#484800", "#394d00",
        "#155400", "#00532d", "#00523e", "#00504a", "#004f53", "#004e5c", "#004c66", "#004875",
        "#003d97", "#301cb6", "#4d00ae", "#5f0098", "#6d0080", "#770068", "#7d0051", "#820039",
        "#6e0018", "#681500", "#5b2700", "#522e00", "#4b3300", "#433700", "#3b3b00", "#2e3f00",
        "#0f4400", "#004424", "#004333", "#00423c", "#004144", "#003f4b", "#003e54", "#003b61",
        "#00317e", "#2800a2", "#3f0091", "#4e007e", "#5a006a", "#620056", "#680042", "#6b002e",
    ]

    static func color(x: Int, y: Int) -> Color {
        let index = y * columns + x
        guard hexes.indices.contains(index) else { return Color("Ink") }
        return Color(hex: hexes[index])
    }
}

struct PalettePatch: View {
    var x0: Int
    var y0: Int
    var columns: Int
    var rows: Int
    var grout: CGFloat = 3
    var corner: CGFloat = 2

    var body: some View {
        Canvas { context, size in
            let cols = CGFloat(columns)
            let rws = CGFloat(rows)
            let cellW = (size.width - grout * (cols - 1)) / cols
            let cellH = (size.height - grout * (rws - 1)) / rws
            guard cellW > 0, cellH > 0 else { return }
            for row in 0..<rows {
                for column in 0..<columns {
                    let rect = CGRect(
                        x: CGFloat(column) * (cellW + grout),
                        y: CGFloat(row) * (cellH + grout),
                        width: cellW,
                        height: cellH
                    )
                    let radius = min(corner, cellW / 2, cellH / 2)
                    context.fill(
                        Path(roundedRect: rect, cornerRadius: radius),
                        with: .color(BoardPalette.color(x: x0 + column, y: y0 + row))
                    )
                }
            }
        }
        .accessibilityHidden(true)
    }
}

extension Color {
    init(hex: String) {
        var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") { value.removeFirst() }
        var parsed: UInt64 = 0
        Scanner(string: value).scanHexInt64(&parsed)
        let red = Double((parsed >> 16) & 0xFF) / 255
        let green = Double((parsed >> 8) & 0xFF) / 255
        let blue = Double(parsed & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }

    static let cabinGold = Color(hex: "E9B005")
    static let cocoa = Color(hex: "191815")
    static let coldSteel = Color(hex: "F8F7F4")

    static let ink2 = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(hex: 0xC9C6BF) : UIColor(hex: 0x4A4843)
    })

    static let ink3 = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(hex: 0x97948D) : UIColor(hex: 0x6B6862)
    })
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

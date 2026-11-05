import SwiftUI

public extension ShapeStyle where Self == Color {
    static var ground: Color { Color(.ground) }
    static var ink: Color { Color(.ink) }
    static var ink2: Color { Color(.ink2) }
    static var ink3: Color { Color(.ink3) }
    static var bone: Color { Color(.bone) }
    static var cocoa: Color { Color(.cocoa) }
    static var rule: Color { Color(.rule) }
}

public extension Image {
    static var logo: Image { Image(.logo) }
    static var lockup: Image { Image(.lockup) }
    static var appIcon: Image { Image(.appIcon) }
}

public extension Font {
    /// Expanded display face for the closed-phone headline.
    static var display: Font {
        .system(.largeTitle, design: .default, weight: .heavy).width(.expanded)
    }

    static var title: Font {
        .system(.title2, design: .default, weight: .semibold)
    }
}

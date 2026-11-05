import Testing
import UIKit
@testable import TintDesign

struct ContrastTests {
    @Test(arguments: [UIUserInterfaceStyle.light, .dark])
    func inkStaysReadable(style: UIUserInterfaceStyle) {
        let ground = resolved(.ground, style: style)
        let ink = resolved(.ink, style: style)
        let ink3 = resolved(.ink3, style: style)

        #expect(contrast(ink, ground) >= 4.5)
        #expect(contrast(ink3, ground) >= 4.5)
    }

    private func resolved(_ resource: ColorResource, style: UIUserInterfaceStyle) -> UIColor {
        UIColor(resource: resource).resolvedColor(with: UITraitCollection(userInterfaceStyle: style))
    }

    private func contrast(_ foreground: UIColor, _ background: UIColor) -> Double {
        let lighter = max(luminance(foreground), luminance(background))
        let darker = min(luminance(foreground), luminance(background))
        return (lighter + 0.05) / (darker + 0.05)
    }

    private func luminance(_ color: UIColor) -> Double {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        func channel(_ value: CGFloat) -> Double {
            let component = Double(value)
            if component <= 0.04045 {
                return component / 12.92
            }
            return pow((component + 0.055) / 1.055, 2.4)
        }

        return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    }
}

// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "TintCore",
    platforms: [
        .iOS("27.1"),
        .macOS(.v26),
    ],
    products: [
        .library(name: "TintCore", targets: ["TintCore"]),
    ],
    targets: [
        .target(name: "TintCore"),
        .testTarget(name: "TintCoreTests", dependencies: ["TintCore"]),
    ],
    swiftLanguageModes: [.v6]
)

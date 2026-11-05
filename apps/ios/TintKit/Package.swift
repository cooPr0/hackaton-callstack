// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "TintKit",
    platforms: [
        .iOS("27.1"),
        .macOS(.v26),
    ],
    products: [
        .library(name: "TintKit", targets: ["TintKit"]),
    ],
    targets: [
        .target(name: "TintKit"),
        .testTarget(name: "TintKitTests", dependencies: ["TintKit"]),
    ],
    swiftLanguageModes: [.v6]
)

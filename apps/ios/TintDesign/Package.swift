// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "TintDesign",
    platforms: [.iOS("27.1")],
    products: [
        .library(name: "TintDesign", targets: ["TintDesign"]),
    ],
    targets: [
        .target(
            name: "TintDesign",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "TintDesignTests",
            dependencies: ["TintDesign"]
        ),
    ]
)

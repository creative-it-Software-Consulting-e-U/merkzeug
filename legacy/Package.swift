// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Merkzeug",
    platforms: [.macOS(.v14)],
    targets: [
        .target(
            name: "MarkdownEngine",
            path: "Sources/MarkdownEngine"
        ),
        .executableTarget(
            name: "Merkzeug",
            dependencies: ["MarkdownEngine"],
            path: "Sources/Merkzeug",
            resources: [
                .copy("Resources/mermaid.min.js"),
                .copy("Resources/Help.de.md"),
                .copy("Resources/Help.en.md"),
            ]
        ),
        .testTarget(
            name: "MarkdownEngineTests",
            dependencies: ["MarkdownEngine"],
            path: "Tests/MarkdownEngineTests"
        ),
        .testTarget(
            name: "MerkzeugTests",
            dependencies: ["Merkzeug", "MarkdownEngine"],
            path: "Tests/MerkzeugTests"
        ),
    ]
)

// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyNotion",
    platforms: [.macOS(.v14)],
    targets: [
        .target(
            name: "MarkdownEngine",
            path: "Sources/MarkdownEngine"
        ),
        .executableTarget(
            name: "MyNotion",
            dependencies: ["MarkdownEngine"],
            path: "Sources/MyNotion",
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
            name: "MyNotionTests",
            dependencies: ["MyNotion", "MarkdownEngine"],
            path: "Tests/MyNotionTests"
        ),
    ]
)

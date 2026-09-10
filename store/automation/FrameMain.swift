import Foundation
import ImageIO

@main enum FrameMain {
    static func main() throws {
        guard CommandLine.arguments.count == 4 else { fatalError("Usage: frame-screenshots CAPTIONS RAW_DIRECTORY OUTPUT_DIRECTORY") }
        let args = CommandLine.arguments
        let captions = try JSONDecoder().decode([String: [String: Caption]].self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
        let source = URL(fileURLWithPath: args[2]), output = URL(fileURLWithPath: args[3])
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        var count = 0
        for file in try FileManager.default.contentsOfDirectory(at: source, includingPropertiesForKeys: nil).sorted(by: { $0.path < $1.path }) where file.pathExtension == "png" {
            let parts = file.deletingPathExtension().lastPathComponent.split(separator: "-").map(String.init)
            guard parts.count == 3, ["macos", "iphone", "ipad"].contains(parts[0]),
                  let caption = captions[parts[1]]?[parts[0] != "macos" && parts[2] == "diagram" ? "repository" : parts[2]],
                  let imageSource = CGImageSourceCreateWithURL(file as CFURL, nil),
                  let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else { throw Failure.invalidFile(file.lastPathComponent) }
            let data = try ScreenshotFrame.render(image, title: caption.title, subtitle: caption.subtitle)
            try data.write(to: output.appendingPathComponent(file.lastPathComponent))
            count += 1
        }
        guard count > 0 else { throw Failure.empty }
        print("Composed \(count) screenshots")
    }
    struct Caption: Decodable { let title: String; let subtitle: String }
    enum Failure: Error { case empty; case invalidFile(String) }
}

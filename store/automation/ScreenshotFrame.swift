import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Shared by XCTest on iOS and the macOS command-line composer. No network or image synthesis.
enum ScreenshotFrame {
    static func render(_ source: CGImage, title: String, subtitle: String) throws -> Data {
        let w = source.width, h = source.height
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { throw Failure.render }
        ctx.setFillColor(CGColor(red: 0.969, green: 0.953, blue: 0.925, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
        let width = CGFloat(w), height = CGFloat(h)
        let margin = width * 0.045
        func text(_ value: String, y: CGFloat, size: CGFloat, font: String, color: CGColor) throws {
            let attributed = NSAttributedString(string: value, attributes: [
                NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName(font as CFString, size, nil),
                NSAttributedString.Key(kCTForegroundColorAttributeName as String): color
            ])
            let line = CTLineCreateWithAttributedString(attributed)
            guard CTLineGetTypographicBounds(line, nil, nil, nil) <= Double(width - margin * 2) else { throw Failure.textOverflow(value) }
            ctx.textPosition = CGPoint(x: margin, y: y)
            CTLineDraw(line, ctx)
        }
        let ink = CGColor(gray: 0.1, alpha: 1), muted = CGColor(gray: 0.35, alpha: 1)
        let landscape = w > h
        try text("MERKZEUG", y: height * 0.957, size: width * 0.018, font: "Menlo", color: muted)
        try text(title, y: height * (landscape ? 0.884 : 0.905), size: width * 0.049, font: "Georgia-Bold", color: ink)
        try text(subtitle, y: height * (landscape ? 0.824 : 0.87), size: width * 0.026, font: "Helvetica", color: muted)
        let available = CGRect(x: margin, y: height * 0.035, width: width - margin * 2, height: height * (landscape ? 0.74 : 0.79))
        let scale = min(available.width / width, available.height / height)
        let frame = CGRect(x: (width - width * scale) / 2, y: available.minY, width: width * scale, height: height * scale)
        ctx.setFillColor(CGColor(gray: 0.82, alpha: 1)); ctx.fill(frame.insetBy(dx: -2, dy: -2))
        ctx.interpolationQuality = .high
        ctx.draw(source, in: frame)
        guard let result = ctx.makeImage() else { throw Failure.render }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else { throw Failure.render }
        CGImageDestinationAddImage(destination, result, nil)
        guard CGImageDestinationFinalize(destination) else { throw Failure.render }
        return data as Data
    }
    enum Failure: Error { case render; case textOverflow(String) }
}

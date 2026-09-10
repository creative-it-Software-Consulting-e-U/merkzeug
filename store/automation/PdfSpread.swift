// Render actual exported pages for the PDF screenshot. No simulated app UI.
import AppKit
import PDFKit

guard CommandLine.arguments.count == 3,
      let document = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])),
      document.pageCount >= 2 else { fatalError("Expected an exported PDF with a cover and content") }
let width = 2880, height = 1800
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                             bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                             colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor(calibratedRed: 0.933, green: 0.91, blue: 0.863, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
let cg = context.cgContext
for index in 0..<2 {
    // Show the cover and the first linked document (diagram + table in our fixture).
    let pageIndex = index == 0 ? 0 : (document.pageCount > 2 ? 2 : 1)
    let page = document.page(at: pageIndex)!
    let bounds = page.bounds(for: .mediaBox)
    let slot = NSRect(x: 100 + index * 1390, y: 80, width: 1290, height: 1640)
    let scale = min(slot.width / bounds.width, slot.height / bounds.height)
    let frame = NSRect(x: slot.midX - bounds.width * scale / 2, y: slot.midY - bounds.height * scale / 2,
                       width: bounds.width * scale, height: bounds.height * scale)
    cg.saveGState()
    cg.setShadow(offset: CGSize(width: 0, height: -10), blur: 24, color: CGColor(gray: 0, alpha: 0.14))
    cg.setFillColor(CGColor(gray: 1, alpha: 1))
    cg.fill(frame)
    cg.restoreGState()
    cg.saveGState()
    cg.translateBy(x: frame.minX, y: frame.minY)
    cg.scaleBy(x: scale, y: scale)
    cg.translateBy(x: -bounds.minX, y: -bounds.minY)
    page.draw(with: .mediaBox, to: cg)
    cg.restoreGState()
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))

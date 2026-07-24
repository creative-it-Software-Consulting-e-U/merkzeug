// Erzeugt Support/AppIcon.icns (einfaches, generiertes App-Icon).
// Aufruf: swift Support/make_icon.swift
import AppKit

func drawIcon(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    let inset = size * 0.06
    let rect = NSRect(x: inset, y: inset, width: size - 2 * inset, height: size - 2 * inset)
    let radius = size * 0.2
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    let gradient = NSGradient(
        starting: NSColor(calibratedRed: 0.16, green: 0.18, blue: 0.24, alpha: 1),
        ending: NSColor(calibratedRed: 0.08, green: 0.09, blue: 0.13, alpha: 1)
    )
    gradient?.draw(in: path, angle: -90)

    // "Seiten"-Linien wie eine Notiz
    let lineColor = NSColor(calibratedWhite: 1.0, alpha: 0.25)
    lineColor.setFill()
    let lineX = rect.minX + rect.width * 0.18
    let lineW = rect.width * 0.42
    for i in 0..<3 {
        let y = rect.minY + rect.height * (0.62 - CGFloat(i) * 0.13)
        NSBezierPath(roundedRect: NSRect(x: lineX, y: y, width: lineW - CGFloat(i) * size * 0.04,
                                         height: size * 0.045),
                     xRadius: size * 0.02, yRadius: size * 0.02).fill()
    }

    // Großes "M"
    let fontSize = size * 0.52
    let font = NSFont.systemFont(ofSize: fontSize, weight: .bold)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor.white,
    ]
    let text = "M" as NSString
    let textSize = text.size(withAttributes: attrs)
    text.draw(at: NSPoint(x: rect.midX - textSize.width * 0.28,
                          y: rect.midY - textSize.height * 0.52),
              withAttributes: attrs)

    image.unlockFocus()
    return image
}

let iconsetURL = URL(fileURLWithPath: "Support/AppIcon.iconset")
try? FileManager.default.removeItem(at: iconsetURL)
try FileManager.default.createDirectory(at: iconsetURL, withIntermediateDirectories: true)

let sizes: [(Int, String)] = [
    (16, "icon_16x16"), (32, "icon_16x16@2x"),
    (32, "icon_32x32"), (64, "icon_32x32@2x"),
    (128, "icon_128x128"), (256, "icon_128x128@2x"),
    (256, "icon_256x256"), (512, "icon_256x256@2x"),
    (512, "icon_512x512"), (1024, "icon_512x512@2x"),
]

for (px, name) in sizes {
    let img = drawIcon(size: CGFloat(px))
    guard let tiff = img.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff) else { continue }
    rep.size = NSSize(width: px, height: px)
    guard let png = rep.representation(using: .png, properties: [:]) else { continue }
    try png.write(to: iconsetURL.appendingPathComponent("\(name).png"))
}

let task = Process()
task.launchPath = "/usr/bin/iconutil"
task.arguments = ["-c", "icns", "Support/AppIcon.iconset", "-o", "Support/AppIcon.icns"]
try task.run()
task.waitUntilExit()
try? FileManager.default.removeItem(at: iconsetURL)
print("Support/AppIcon.icns erzeugt")

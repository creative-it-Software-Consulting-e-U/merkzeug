import XCTest
@testable import MyNotion

final class MermaidRendererTests: XCTestCase {

    func testRendersSimpleFlowchart() {
        let exp = expectation(description: "mermaid gerendert")
        var result: NSImage?
        MermaidRenderer.shared.render("flowchart TD\n    A[Start] --> B[Ende]") { image in
            result = image
            exp.fulfill()
        }
        wait(for: [exp], timeout: 30)
        XCTAssertNotNil(result, "Renderer lieferte kein Bild")
        if let image = result {
            XCTAssertGreaterThan(image.size.width, 20)
            XCTAssertGreaterThan(image.size.height, 20)
        }
        // Optional: Bild zur Sichtkontrolle ablegen (MERMAID_DUMP=/pfad/zur.png)
        if let dumpPath = ProcessInfo.processInfo.environment["MERMAID_DUMP"],
           let tiff = result?.tiffRepresentation,
           let rep = NSBitmapImageRep(data: tiff),
           let png = rep.representation(using: .png, properties: [:]) {
            try? png.write(to: URL(fileURLWithPath: dumpPath))
        }
    }

    func testZoomScaleRendersHigherResolution() throws {
        let source = "flowchart LR\n    X --> Y"
        var inline: NSImage?
        var zoomed: NSImage?
        let expInline = expectation(description: "inline gerendert")
        let expZoom = expectation(description: "zoom gerendert")
        MermaidRenderer.shared.render(source) { image in
            inline = image
            expInline.fulfill()
        }
        MermaidRenderer.shared.render(source, scale: MermaidRenderer.zoomScale) { image in
            zoomed = image
            expZoom.fulfill()
        }
        wait(for: [expInline, expZoom], timeout: 30)
        let small = try XCTUnwrap(inline)
        let big = try XCTUnwrap(zoomed)
        // Gleiche logische Größe, aber mehr Pixel für scharfes Hineinzoomen
        XCTAssertEqual(small.size.width, big.size.width, accuracy: 2)
        XCTAssertEqual(small.size.height, big.size.height, accuracy: 2)
        let smallPixels = small.representations.first?.pixelsWide ?? 0
        let bigPixels = big.representations.first?.pixelsWide ?? 0
        XCTAssertGreaterThan(bigPixels, smallPixels,
                             "Zoom-Rendering muss höher aufgelöst sein")
    }

    func testInvalidSourceReturnsNil() {
        let exp = expectation(description: "fehler erkannt")
        var result: NSImage? = NSImage()
        MermaidRenderer.shared.render("definitiv kein gültiges mermaid $$$") { image in
            result = image
            exp.fulfill()
        }
        wait(for: [exp], timeout: 30)
        XCTAssertNil(result, "Ungültiger Quelltext sollte nil liefern")
    }
}

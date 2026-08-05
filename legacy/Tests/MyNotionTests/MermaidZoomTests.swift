import XCTest
import AppKit
@testable import MyNotion
@testable import MarkdownEngine

/// Headless-Tests für den Zoom-Einstieg an Mermaid-Diagrammen
/// (Treffer-Erkennung fürs ⌘-Klick/Kontextmenü und die Hover-Lupe).
final class MermaidZoomTests: XCTestCase {

    private var tempDir: URL!

    private let markdown = """
    Ein Absatz davor.

    ```mermaid
    flowchart TD
        A --> B
    ```

    Ein Absatz danach.
    """

    override func setUpWithError() throws {
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("MyNotionTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: tempDir)
    }

    private func makeEditor(_ markdown: String) throws -> MarkdownTextView {
        let url = tempDir.appendingPathComponent("Test.md")
        try markdown.write(to: url, atomically: true, encoding: .utf8)
        let doc = MarkdownDocument(url: url)
        let controller = EditorController(document: doc)
        controller.textView.frame = NSRect(x: 0, y: 0, width: 700, height: 800)
        return controller.textView
    }

    private func attachmentInfo(_ tv: MarkdownTextView) throws -> (index: Int, center: NSPoint) {
        let ts = try XCTUnwrap(tv.textStorage)
        var index: Int?
        for i in 0..<ts.length where tv.mermaidSource(at: i) != nil { index = i; break }
        let idx = try XCTUnwrap(index, "Kein Mermaid-Attachment gefunden")
        let lm = try XCTUnwrap(tv.layoutManager)
        let tc = try XCTUnwrap(tv.textContainer)
        let glyphRange = lm.glyphRange(forCharacterRange: NSRange(location: idx, length: 1),
                                       actualCharacterRange: nil)
        var rect = lm.boundingRect(forGlyphRange: glyphRange, in: tc)
        rect.origin.x += tv.textContainerOrigin.x
        rect.origin.y += tv.textContainerOrigin.y
        return (idx, NSPoint(x: rect.midX, y: rect.midY))
    }

    func testMermaidHitFindsAttachment() throws {
        let tv = try makeEditor(markdown)
        let (index, center) = try attachmentInfo(tv)

        let hit = try XCTUnwrap(tv.mermaidHit(at: center),
                                "Punkt in der Diagrammmitte muss treffen")
        XCTAssertEqual(hit.index, index)
        XCTAssertTrue(hit.rect.contains(center))

        XCTAssertNil(tv.mermaidHit(at: NSPoint(x: 650, y: 780)),
                     "Punkt außerhalb des Diagramms darf nicht treffen")
    }

    func testHoverLensAppearsAndHides() throws {
        let tv = try makeEditor(markdown)
        let (index, center) = try attachmentInfo(tv)

        tv.updateMermaidLens(for: center)
        let button = try XCTUnwrap(tv.mermaidLensButton, "Lupe sollte erzeugt worden sein")
        XCTAssertFalse(button.isHidden)
        XCTAssertEqual(tv.mermaidLensIndex, index)

        tv.updateMermaidLens(for: NSPoint(x: 650, y: 780))
        XCTAssertTrue(button.isHidden)
        XCTAssertEqual(tv.mermaidLensIndex, -1)
    }

    func testWindowDeliversMouseMovedForLens() throws {
        let tv = try makeEditor(markdown)
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 700, height: 800),
                              styleMask: [.titled, .resizable], backing: .buffered, defer: false)
        window.contentView = tv.enclosingScrollView

        // Ohne diese beiden Zutaten erreicht kein Mouse-Moved-Event die
        // Hover-Lupe (Tracking-Areas liefern im SwiftUI-Fenster nicht).
        XCTAssertTrue(window.acceptsMouseMovedEvents,
                      "Fenster muss Mouse-Moved-Events generieren")
        XCTAssertNotNil(tv.mermaidLensMonitor,
                        "Event-Monitor muss nach Fenster-Anbindung installiert sein")

        // Beim Entfernen aus dem Fenster wird der Monitor abgebaut
        window.contentView = nil
        XCTAssertNil(tv.mermaidLensMonitor)
    }

    func testExpandHidesLens() throws {
        let tv = try makeEditor(markdown)
        let (index, center) = try attachmentInfo(tv)
        tv.updateMermaidLens(for: center)
        XCTAssertFalse(try XCTUnwrap(tv.mermaidLensButton).isHidden)

        tv.expandMermaidBlock(at: index)
        XCTAssertTrue(try XCTUnwrap(tv.mermaidLensButton).isHidden,
                      "Beim Aufklappen zum Codeblock muss die Lupe verschwinden")
    }
}

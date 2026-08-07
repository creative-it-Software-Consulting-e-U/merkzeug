import XCTest
import AppKit
@testable import Merkzeug
@testable import MarkdownEngine

/// Headless-Tests für das Umschalten Mermaid-Diagramm ⇄ Codeblock.
final class MermaidToggleTests: XCTestCase {

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
            .appendingPathComponent("MerkzeugTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: tempDir)
    }

    private func makeEditor(_ markdown: String) throws -> (EditorController, MarkdownTextView) {
        let url = tempDir.appendingPathComponent("Test.md")
        try markdown.write(to: url, atomically: true, encoding: .utf8)
        let doc = MarkdownDocument(url: url)
        let controller = EditorController(document: doc)
        controller.textView.frame = NSRect(x: 0, y: 0, width: 700, height: 800)
        return (controller, controller.textView)
    }

    private func serialized(_ controller: EditorController) -> String {
        MarkdownSerializer.markdown(from: controller.document.textStorage)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func mermaidAttachmentIndex(_ tv: MarkdownTextView) -> Int? {
        guard let ts = tv.textStorage else { return nil }
        for i in 0..<ts.length where tv.mermaidSource(at: i) != nil { return i }
        return nil
    }

    func testLoadShowsAttachmentAndRoundTrips() throws {
        let (controller, tv) = try makeEditor(markdown)
        XCTAssertNotNil(mermaidAttachmentIndex(tv), "Mermaid-Block sollte als Attachment geladen werden")
        XCTAssertEqual(serialized(controller), markdown)
    }

    func testExpandToCodeAndCollapseBack() throws {
        let (controller, tv) = try makeEditor(markdown)
        let index = try XCTUnwrap(mermaidAttachmentIndex(tv))

        // Diagramm → Codeblock
        tv.expandMermaidBlock(at: index)
        XCTAssertNil(mermaidAttachmentIndex(tv), "Nach dem Aufklappen darf kein Attachment mehr da sein")
        let ts = try XCTUnwrap(tv.textStorage)
        let lang = ts.attribute(.mnCodeLanguage, at: tv.selectedRange().location, effectiveRange: nil) as? String
        XCTAssertEqual(lang, "mermaid")
        XCTAssertEqual(serialized(controller), markdown, "Markdown bleibt in der Code-Ansicht identisch")

        // Cursor im Block → bleibt Code
        tv.collapseInactiveMermaidBlocks()
        XCTAssertNil(mermaidAttachmentIndex(tv))

        // Cursor verlässt den Block → wieder Diagramm
        tv.setSelectedRange(NSRange(location: 0, length: 0))
        tv.collapseInactiveMermaidBlocks()
        XCTAssertNotNil(mermaidAttachmentIndex(tv), "Nach Verlassen des Blocks sollte wieder gerendert werden")
        XCTAssertEqual(serialized(controller), markdown)
    }

    func testAttachmentGetsRenderedImage() throws {
        let (_, tv) = try makeEditor(markdown)
        let index = try XCTUnwrap(mermaidAttachmentIndex(tv))
        let ts = try XCTUnwrap(tv.textStorage)

        let exp = expectation(description: "Platzhalter wird durch Diagramm ersetzt")
        var observed: NSSize = .zero
        func poll() {
            let attachment = ts.attribute(.attachment, at: index, effectiveRange: nil) as? NSTextAttachment
            let size = attachment?.bounds.size ?? .zero
            // Platzhalter ist 280×44; das gerenderte Diagramm hat andere Maße
            if size != .zero, size != NSSize(width: 280, height: 44) {
                observed = size
                exp.fulfill()
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { poll() }
            }
        }
        poll()
        wait(for: [exp], timeout: 30)
        XCTAssertGreaterThan(observed.width, 20)
        XCTAssertGreaterThan(observed.height, 20)
    }

    func testEditedSourceIsPreservedOnCollapse() throws {
        let (controller, tv) = try makeEditor(markdown)
        let index = try XCTUnwrap(mermaidAttachmentIndex(tv))
        tv.expandMermaidBlock(at: index)

        // Am Blockende eine Zeile ergänzen
        let ts = try XCTUnwrap(tv.textStorage)
        var blockRange = NSRange(location: NSNotFound, length: 0)
        _ = ts.attribute(.mnCodeBlockID, at: tv.selectedRange().location,
                         longestEffectiveRange: &blockRange,
                         in: NSRange(location: 0, length: ts.length))
        let insertAt = NSMaxRange(blockRange)
        tv.setSelectedRange(NSRange(location: insertAt, length: 0))
        tv.insertText("    B --> C\n", replacementRange: NSRange(location: insertAt, length: 0))

        tv.setSelectedRange(NSRange(location: 0, length: 0))
        tv.collapseInactiveMermaidBlocks()
        XCTAssertTrue(serialized(controller).contains("B --> C"),
                      "Bearbeiteter Quelltext muss beim Zuklappen erhalten bleiben")
    }
}

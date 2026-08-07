import XCTest
import AppKit
@testable import Merkzeug
@testable import MarkdownEngine

/// Headless-Tests der Editor-Befehle: Dokument laden, Befehl ausführen,
/// serialisieren und Markdown-Ergebnis prüfen.
final class EditorCommandTests: XCTestCase {

    private var tempDir: URL!

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
        // Layout einmal anstoßen, damit der TextKit-Stack initialisiert ist
        controller.textView.frame = NSRect(x: 0, y: 0, width: 700, height: 800)
        return (controller, controller.textView)
    }

    private func serialized(_ controller: EditorController) -> String {
        MarkdownSerializer.markdown(from: controller.document.textStorage)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func testToggleBoldOnSelection() throws {
        let (controller, tv) = try makeEditor("Hallo Welt")
        tv.setSelectedRange(NSRange(location: 0, length: 5))
        tv.toggleBold()
        XCTAssertEqual(serialized(controller), "**Hallo** Welt")
        tv.toggleBold()
        XCTAssertEqual(serialized(controller), "Hallo Welt")
    }

    func testSetHeading() throws {
        let (controller, tv) = try makeEditor("Titelzeile")
        tv.setSelectedRange(NSRange(location: 2, length: 0))
        tv.setHeadingLevel(2)
        XCTAssertEqual(serialized(controller), "## Titelzeile")
        tv.setHeadingLevel(0)
        XCTAssertEqual(serialized(controller), "Titelzeile")
    }

    func testListToggleAndContinuation() throws {
        let (controller, tv) = try makeEditor("Erster Punkt")
        tv.setSelectedRange(NSRange(location: 3, length: 0))
        tv.setList(ordered: false)
        XCTAssertEqual(serialized(controller), "- Erster Punkt")

        // Ans Zeilenende, Enter → neuer Punkt, Text tippen
        let end = (tv.string as NSString).paragraphRange(for: NSRange(location: 0, length: 0))
        tv.setSelectedRange(NSRange(location: max(0, end.length - 1), length: 0))
        tv.insertNewline(nil)
        tv.insertText("Zweiter Punkt", replacementRange: tv.selectedRange())
        XCTAssertEqual(serialized(controller), "- Erster Punkt\n- Zweiter Punkt")
    }

    func testOrderedListRenumbering() throws {
        let (controller, tv) = try makeEditor("1. Eins\n2. Zwei\n3. Drei")
        // Mitte des zweiten Punkts: Absatz löschen
        let ns = tv.string as NSString
        let firstPr = ns.paragraphRange(for: NSRange(location: 0, length: 0))
        let secondPr = ns.paragraphRange(for: NSRange(location: NSMaxRange(firstPr), length: 0))
        tv.setSelectedRange(NSRange(location: secondPr.location, length: 0))
        if tv.shouldChangeText(in: secondPr, replacementString: "") {
            tv.textStorage?.replaceCharacters(in: secondPr, with: "")
            tv.didChangeText()
        }
        tv.renumberOrderedLists()
        XCTAssertEqual(serialized(controller), "1. Eins\n2. Drei")
    }

    func testInsertTableAndAddRow() throws {
        let (controller, tv) = try makeEditor("Davor")
        tv.setSelectedRange(NSRange(location: 0, length: 0))
        tv.insertTable(rows: 2, cols: 2)
        var md = serialized(controller)
        XCTAssertTrue(md.contains("| Spalte 1 | Spalte 2 |"), md)
        XCTAssertTrue(md.contains("| --- | --- |"), md)

        // Cursor steht in Zelle (0,0); Tab bis in die letzte Zelle und noch einmal → neue Zeile
        tv.moveToAdjacentCell(forward: true)
        tv.moveToAdjacentCell(forward: true)
        tv.moveToAdjacentCell(forward: true)
        tv.insertText("X", replacementRange: tv.selectedRange())
        tv.moveToAdjacentCell(forward: true) // letzte Zelle → neue Zeile
        md = serialized(controller)
        XCTAssertTrue(md.contains("| X |") || md.contains("| X"), md)
        XCTAssertEqual(md.components(separatedBy: "\n").filter { $0.hasPrefix("|") }.count, 4, md)
    }

    func testTableInsertAndDeleteColumn() throws {
        let (controller, tv) = try makeEditor("| A | B |\n| --- | --- |\n| 1 | 2 |")
        // In die erste Zelle
        tv.setSelectedRange(NSRange(location: 0, length: 0))
        XCTAssertNotNil(tv.tableInfo(at: 0))
        tv.tableInsertColumnRight(nil)
        var md = serialized(controller)
        XCTAssertTrue(md.contains("| A |  | B |"), md)
        tv.setSelectedRange(NSRange(location: 0, length: 0))
        tv.tableDeleteColumn(nil)
        md = serialized(controller)
        XCTAssertTrue(md.contains("|  | B |"), md)
    }

    func testQuoteAndCodeBlockToggle() throws {
        let (controller, tv) = try makeEditor("Zitat hier")
        tv.setSelectedRange(NSRange(location: 1, length: 0))
        tv.toggleQuote()
        XCTAssertEqual(serialized(controller), "> Zitat hier")

        let (controller2, tv2) = try makeEditor("code hier")
        tv2.setSelectedRange(NSRange(location: 1, length: 0))
        tv2.toggleCodeBlock()
        XCTAssertEqual(serialized(controller2), "```\ncode hier\n```")
    }

    func testApplyLink() throws {
        let (controller, tv) = try makeEditor("Siehe Doku bitte")
        tv.setSelectedRange(NSRange(location: 6, length: 4))
        let ctx = tv.currentLinkContext()
        XCTAssertEqual(ctx.text, "Doku")
        tv.applyLink(text: "Doku", url: "https://example.com", range: ctx.range)
        XCTAssertEqual(serialized(controller), "Siehe [Doku](https://example.com) bitte")
    }

    func testInsertImageAttachment() throws {
        // Kleines PNG erzeugen
        let img = NSImage(size: NSSize(width: 4, height: 4))
        img.lockFocus()
        NSColor.red.setFill()
        NSRect(x: 0, y: 0, width: 4, height: 4).fill()
        img.unlockFocus()
        let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
        let png = rep.representation(using: .png, properties: [:])!
        let source = tempDir.appendingPathComponent("quelle.png")
        try png.write(to: source)

        let (controller, tv) = try makeEditor("Bild: ")
        tv.setSelectedRange(NSRange(location: 6, length: 0))
        tv.insertImages(from: [source])
        let md = serialized(controller)
        XCTAssertTrue(md.contains("![](Test.assets/quelle.png)"), md)
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: tempDir.appendingPathComponent("Test.assets/quelle.png").path))
    }

    func testAutosaveRoundTrip() throws {
        let (controller, tv) = try makeEditor("# Alt")
        tv.setSelectedRange(NSRange(location: tv.string.utf16.count - 1, length: 0))
        tv.insertText(" Neu", replacementRange: tv.selectedRange())
        controller.document.noteEdited()
        controller.document.save()
        let onDisk = try String(contentsOf: controller.document.fileURL, encoding: .utf8)
        XCTAssertEqual(onDisk.trimmingCharacters(in: .whitespacesAndNewlines), "# Alt Neu")
    }

    func testVaultRenameMovesAssets() throws {
        let vault = VaultStore()
        let mdURL = tempDir.appendingPathComponent("Notiz.md")
        try "![](Notiz.assets/b.png)".write(to: mdURL, atomically: true, encoding: .utf8)
        let assets = tempDir.appendingPathComponent("Notiz.assets")
        try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)
        try Data([1, 2, 3]).write(to: assets.appendingPathComponent("b.png"))

        let newURL = try vault.rename(mdURL, to: "Umbenannt")
        XCTAssertEqual(newURL.lastPathComponent, "Umbenannt.md")
        XCTAssertTrue(FileManager.default.fileExists(
            atPath: tempDir.appendingPathComponent("Umbenannt.assets/b.png").path))
        let content = try String(contentsOf: newURL, encoding: .utf8)
        XCTAssertTrue(content.contains("Umbenannt.assets/b.png"), content)
    }
}

import XCTest
@testable import MyNotion

/// Reproduziert einen echten Maus-Klick auf einen Link im Editor und prüft,
/// dass er im Navigationsmodus im selben Tab lädt (statt einen neuen zu öffnen).
final class LinkClickModeTests: XCTestCase {

    private var dir: URL!
    private var noteA: URL!
    private var noteB: URL!
    private var folder: URL!
    private var noteC: URL!

    override func setUpWithError() throws {
        dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("MyNotionLinkClickTests-\(UUID().uuidString)")
        folder = dir.appendingPathComponent("Projekte")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        noteA = dir.appendingPathComponent("A.md")
        noteB = dir.appendingPathComponent("B.md")
        noteC = folder.appendingPathComponent("C.md")
        try "Hier: [Beta](B.md) und [Projekte](Projekte) Ende"
            .write(to: noteA, atomically: true, encoding: .utf8)
        try "# B".write(to: noteB, atomically: true, encoding: .utf8)
        try "# C".write(to: noteC, atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: dir)
    }

    @MainActor
    private func makeApp() -> (AppState, EditorTab, NSWindow) {
        let app = AppState()
        app.vault.open(dir)
        app.open(noteA)
        let tab = app.activeTab!
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 800, height: 600),
            styleMask: [.titled], backing: .buffered, defer: false)
        window.contentView = tab.controller!.scrollView
        window.orderFrontRegardless()
        tab.controller!.textView.layoutManager?.ensureLayout(
            for: tab.controller!.textView.textContainer!)
        return (app, tab, window)
    }

    /// Fensterposition der Mitte des Links mit dem angegebenen Ziel.
    @MainActor
    private func linkPointInWindow(_ textView: MarkdownTextView, target: String) -> NSPoint? {
        guard let ts = textView.textStorage, ts.length > 0 else { return nil }
        var linkRange = NSRange(location: NSNotFound, length: 0)
        ts.enumerateAttribute(.link, in: NSRange(location: 0, length: ts.length)) { value, range, stop in
            if let value, "\(value)".contains(target) { linkRange = range; stop.pointee = true }
        }
        guard linkRange.location != NSNotFound,
              let lm = textView.layoutManager, let tc = textView.textContainer else { return nil }
        let glyphRange = lm.glyphRange(forCharacterRange: linkRange, actualCharacterRange: nil)
        var rect = lm.boundingRect(forGlyphRange: glyphRange, in: tc)
        rect.origin.x += textView.textContainerOrigin.x
        rect.origin.y += textView.textContainerOrigin.y
        let mid = NSPoint(x: rect.midX, y: rect.midY)
        return textView.convert(mid, to: nil)
    }

    @MainActor
    private func click(at point: NSPoint, in window: NSWindow, on textView: NSTextView) {
        let down = NSEvent.mouseEvent(
            with: .leftMouseDown, location: point, modifierFlags: [],
            timestamp: ProcessInfo.processInfo.systemUptime,
            windowNumber: window.windowNumber, context: nil,
            eventNumber: 1, clickCount: 1, pressure: 1)!
        let up = NSEvent.mouseEvent(
            with: .leftMouseUp, location: point, modifierFlags: [],
            timestamp: ProcessInfo.processInfo.systemUptime + 0.05,
            windowNumber: window.windowNumber, context: nil,
            eventNumber: 2, clickCount: 1, pressure: 0)!
        NSApp.postEvent(up, atStart: false)
        textView.mouseDown(with: down)
    }

    @MainActor
    func testKlickImNavigationsmodusLaedtImSelbenTab() throws {
        let (app, tab, window) = makeApp()
        defer { window.orderOut(nil) }
        app.toggleNavigationMode()
        XCTAssertTrue(tab.isNavigationMode)

        let point = try XCTUnwrap(linkPointInWindow(tab.controller!.textView, target: "B.md"))
        click(at: point, in: window, on: tab.controller!.textView)

        XCTAssertEqual(app.activePane.tabs.count, 1,
                       "Link darf im Navigationsmodus keinen neuen Tab öffnen")
        XCTAssertEqual(tab.url, noteB, "Link muss im selben Tab geladen werden")
        XCTAssertEqual(tab.backStack, [noteA])
    }

    @MainActor
    func testOrdnerLinkImNavigationsmodusBleibtImSelbenTab() throws {
        let (app, tab, window) = makeApp()
        defer { window.orderOut(nil) }
        app.toggleNavigationMode()

        let point = try XCTUnwrap(linkPointInWindow(tab.controller!.textView, target: "Projekte"))
        click(at: point, in: window, on: tab.controller!.textView)

        XCTAssertEqual(app.activePane.tabs.count, 1,
                       "Ordner-Link darf im Navigationsmodus keinen neuen Tab öffnen")
        XCTAssertTrue(tab.showsFolder, "Tab muss die Ordner-Übersicht anzeigen")
        XCTAssertEqual(tab.url.lastPathComponent, "Projekte")
        XCTAssertEqual(tab.backStack, [noteA])

        // Zurück führt wieder zur Notiz im Editor.
        app.goBack(tab)
        XCTAssertFalse(tab.showsFolder)
        XCTAssertEqual(tab.url, noteA)
    }

    @MainActor
    func testOrdnerUebersichtNavigiertImSelbenTab() throws {
        let (app, tab, window) = makeApp()
        defer { window.orderOut(nil) }
        app.toggleNavigationMode()
        app.navigate(tab, to: folder.mnCanonical)
        XCTAssertTrue(tab.showsFolder)

        // Klick auf eine Notiz in der Übersicht (Logik hinter dem Tap).
        app.openFolderEntry(noteC, from: tab)
        XCTAssertEqual(app.activePane.tabs.count, 1)
        XCTAssertFalse(tab.showsFolder)
        XCTAssertEqual(tab.url, noteC.mnCanonical)
        XCTAssertEqual(tab.backStack, [noteA, folder.mnCanonical])
    }

    @MainActor
    func testModusVerlassenZeigtWiederDieNotiz() throws {
        let (app, tab, window) = makeApp()
        defer { window.orderOut(nil) }
        app.toggleNavigationMode()
        app.navigate(tab, to: folder.mnCanonical)
        XCTAssertTrue(tab.showsFolder)

        app.toggleNavigationMode()
        XCTAssertFalse(tab.isNavigationMode)
        XCTAssertFalse(tab.showsFolder)
        XCTAssertEqual(tab.url, noteA, "Nach Verlassen des Modus zeigt der Tab die Notiz")
    }

    @MainActor
    func testKlickImEditModusOeffnetNeuenTab() throws {
        let (app, tab, window) = makeApp()
        defer { window.orderOut(nil) }
        XCTAssertFalse(tab.isNavigationMode)

        let point = try XCTUnwrap(linkPointInWindow(tab.controller!.textView, target: "B.md"))
        click(at: point, in: window, on: tab.controller!.textView)

        XCTAssertEqual(app.activePane.tabs.count, 2,
                       "Im Edit-Modus soll der Link in einem neuen Tab aufgehen")
    }
}

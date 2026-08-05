import XCTest
@testable import MyNotion

final class NavigationModeTests: XCTestCase {

    private var dir: URL!
    private var noteA: URL!
    private var noteB: URL!

    override func setUpWithError() throws {
        dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("MyNotionNavTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        noteA = dir.appendingPathComponent("A.md")
        noteB = dir.appendingPathComponent("B.md")
        try "# A".write(to: noteA, atomically: true, encoding: .utf8)
        try "# B".write(to: noteB, atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: dir)
    }

    @MainActor
    func testNavigateBackForward() {
        let app = AppState()
        let tab = EditorTab(url: noteA)
        tab.isNavigationMode = true

        app.navigate(tab, to: noteB)
        XCTAssertEqual(tab.url, noteB)
        XCTAssertEqual(tab.backStack, [noteA])
        XCTAssertTrue(tab.forwardStack.isEmpty)

        app.goBack(tab)
        XCTAssertEqual(tab.url, noteA)
        XCTAssertTrue(tab.backStack.isEmpty)
        XCTAssertEqual(tab.forwardStack, [noteB])

        app.goForward(tab)
        XCTAssertEqual(tab.url, noteB)
        XCTAssertEqual(tab.backStack, [noteA])
        XCTAssertTrue(tab.forwardStack.isEmpty)
    }

    @MainActor
    func testGoBackIgnoriertGeloeschteDateienUndInaktivenModus() {
        let app = AppState()
        let tab = EditorTab(url: noteB)

        // Ohne Navigationsmodus passiert nichts.
        tab.backStack = [noteA]
        app.goBack(tab)
        XCTAssertEqual(tab.url, noteB)
        XCTAssertEqual(tab.backStack, [noteA])

        // Gelöschte Einträge werden übersprungen.
        tab.isNavigationMode = true
        let missing = dir.appendingPathComponent("Geloescht.md")
        tab.backStack = [noteA, missing]
        app.goBack(tab)
        XCTAssertEqual(tab.url, noteA)
        XCTAssertTrue(tab.backStack.isEmpty)
        XCTAssertEqual(tab.forwardStack, [noteB])
    }
}

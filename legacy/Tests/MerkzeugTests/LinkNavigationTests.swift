import XCTest
@testable import Merkzeug

/// Tests für vault-interne Links (Dateien, Ordner) und das Aufklappen der Sidebar.
final class LinkNavigationTests: XCTestCase {

    private var vaultDir: URL!

    override func setUpWithError() throws {
        vaultDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("MerkzeugLinkTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(
            at: vaultDir.appendingPathComponent("docs/unterordner"),
            withIntermediateDirectories: true
        )
        try "# Readme".write(
            to: vaultDir.appendingPathComponent("README.md"),
            atomically: true, encoding: .utf8
        )
        try "# Notiz".write(
            to: vaultDir.appendingPathComponent("docs/notiz.md"),
            atomically: true, encoding: .utf8
        )
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: vaultDir)
    }

    // MARK: - resolveLocalLink

    func testResolveAbsolutePath() {
        let target = vaultDir.appendingPathComponent("docs/notiz.md")
        let resolved = AppState.resolveLocalLink(
            target.path, baseDirectory: vaultDir, vaultRoot: vaultDir
        )
        XCTAssertEqual(resolved?.path, target.path)
    }

    func testResolveRelativeToFile() {
        let resolved = AppState.resolveLocalLink(
            "notiz.md",
            baseDirectory: vaultDir.appendingPathComponent("docs"),
            vaultRoot: vaultDir
        )
        XCTAssertEqual(resolved?.path, vaultDir.appendingPathComponent("docs/notiz.md").path)
    }

    func testResolveRelativeToVaultRootAsFallback() {
        // Basis ist docs/, der Link zeigt aber auf einen Pfad ab Vault-Wurzel.
        let resolved = AppState.resolveLocalLink(
            "README.md",
            baseDirectory: vaultDir.appendingPathComponent("docs/unterordner"),
            vaultRoot: vaultDir
        )
        XCTAssertEqual(resolved?.path, vaultDir.appendingPathComponent("README.md").path)
    }

    func testResolveDirectoryLink() {
        let resolved = AppState.resolveLocalLink(
            "docs", baseDirectory: vaultDir, vaultRoot: vaultDir
        )
        XCTAssertEqual(resolved?.path, vaultDir.appendingPathComponent("docs").path)
    }

    func testResolveMissingTargetReturnsNil() {
        XCTAssertNil(AppState.resolveLocalLink(
            "gibts-nicht.md", baseDirectory: vaultDir, vaultRoot: vaultDir
        ))
    }

    // MARK: - VaultStore

    func testIsInVault() {
        let store = VaultStore()
        store.open(vaultDir)
        XCTAssertTrue(store.isInVault(vaultDir.appendingPathComponent("docs/notiz.md")))
        XCTAssertTrue(store.isInVault(vaultDir))
        XCTAssertFalse(store.isInVault(FileManager.default.temporaryDirectory))
    }

    func testRevealExpandsAncestorsForFolder() {
        let store = VaultStore()
        store.open(vaultDir)
        let deep = vaultDir.appendingPathComponent("docs/unterordner")
        store.reveal(deep)
        XCTAssertTrue(store.expandedFolders.contains(deep.standardizedFileURL.path))
        XCTAssertTrue(store.expandedFolders.contains(
            vaultDir.appendingPathComponent("docs").standardizedFileURL.path
        ))
    }

    func testRevealFileExpandsOnlyAncestors() {
        let store = VaultStore()
        store.open(vaultDir)
        let file = vaultDir.appendingPathComponent("docs/notiz.md")
        store.reveal(file)
        XCTAssertTrue(store.expandedFolders.contains(
            vaultDir.appendingPathComponent("docs").standardizedFileURL.path
        ))
        XCTAssertFalse(store.expandedFolders.contains(file.standardizedFileURL.path))
    }

    // MARK: - AppState: Ordner öffnen

    @MainActor
    func testOpenFolderCreatesTabAndExpandsSidebar() {
        let app = AppState()
        app.vault.open(vaultDir)
        let docs = vaultDir.appendingPathComponent("docs")

        app.openFolder(docs)

        let tab = app.activePane.selectedTab
        XCTAssertEqual(tab?.kind, .folder)
        XCTAssertEqual(tab?.url.path, docs.mnCanonical.path)
        XCTAssertNil(tab?.document)
        XCTAssertTrue(app.vault.expandedFolders.contains(docs.mnCanonical.path))

        // Nochmaliges Öffnen erzeugt keinen zweiten Tab.
        app.openFolder(docs)
        XCTAssertEqual(app.activePane.tabs.count, 1)
    }

    @MainActor
    func testOpenDirectoryURLRoutesToFolderTab() {
        let app = AppState()
        app.vault.open(vaultDir)

        app.open(vaultDir.appendingPathComponent("docs/unterordner"))

        XCTAssertEqual(app.activePane.selectedTab?.kind, .folder)
        // Alle Zwischenordner sind aufgeklappt.
        XCTAssertTrue(app.vault.expandedFolders.contains(
            vaultDir.appendingPathComponent("docs").mnCanonical.path
        ))
    }

    @MainActor
    func testOpenMarkdownFileCreatesEditorTab() {
        let app = AppState()
        app.vault.open(vaultDir)

        app.open(vaultDir.appendingPathComponent("docs/notiz.md"))

        let tab = app.activePane.selectedTab
        XCTAssertEqual(tab?.kind, .markdown)
        XCTAssertNotNil(tab?.document)
        XCTAssertNotNil(tab?.controller)
    }

    func testNodeForURL() {
        let store = VaultStore()
        store.open(vaultDir)
        let node = store.node(for: vaultDir.appendingPathComponent("docs"))
        XCTAssertNotNil(node)
        XCTAssertTrue(node?.isDirectory ?? false)
        XCTAssertEqual(
            node?.children?.contains { $0.name == "notiz.md" },
            true
        )
    }
}

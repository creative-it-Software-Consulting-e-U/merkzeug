import XCTest
@testable import Merkzeug

final class RecentVaultsTests: XCTestCase {

    private var defaults: UserDefaults!
    private let suite = "RecentVaultsTests"

    override func setUp() {
        defaults = UserDefaults(suiteName: suite)
        defaults.removePersistentDomain(forName: suite)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
    }

    func testNeuesterEintragVorneOhneDuplikate() {
        let recents = RecentVaults(defaults: defaults)
        recents.noteOpened(URL(fileURLWithPath: "/tmp/a"))
        recents.noteOpened(URL(fileURLWithPath: "/tmp/b"))
        recents.noteOpened(URL(fileURLWithPath: "/tmp/a"))
        XCTAssertEqual(recents.paths, ["/tmp/a", "/tmp/b"])
    }

    func testMaximalZehnEintraege() {
        let recents = RecentVaults(defaults: defaults)
        for i in 1...12 {
            recents.noteOpened(URL(fileURLWithPath: "/tmp/vault\(i)"))
        }
        XCTAssertEqual(recents.paths.count, RecentVaults.maxCount)
        XCTAssertEqual(recents.paths.first, "/tmp/vault12")
        XCTAssertFalse(recents.paths.contains("/tmp/vault1"))
        XCTAssertFalse(recents.paths.contains("/tmp/vault2"))
    }

    func testPersistenzUndLoeschen() {
        let recents = RecentVaults(defaults: defaults)
        recents.noteOpened(URL(fileURLWithPath: "/tmp/a"))

        let reloaded = RecentVaults(defaults: defaults)
        XCTAssertEqual(reloaded.paths, ["/tmp/a"])

        reloaded.clear()
        XCTAssertTrue(reloaded.paths.isEmpty)
        XCTAssertTrue(RecentVaults(defaults: defaults).paths.isEmpty)
    }
}

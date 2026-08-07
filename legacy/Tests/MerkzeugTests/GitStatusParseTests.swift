import XCTest
@testable import Merkzeug

final class GitStatusParseTests: XCTestCase {

    func testSauberesRepoMitUpstreamUndAheadBehind() {
        let porcelain = """
        # branch.oid 22e5c03deadbeef
        # branch.head main
        # branch.upstream origin/main
        # branch.ab +2 -1
        """
        let status = GitStatusModel.parseStatus(porcelain)
        XCTAssertEqual(status.branch, "main")
        XCTAssertEqual(status.upstream, "origin/main")
        XCTAssertEqual(status.ahead, 2)
        XCTAssertEqual(status.behind, 1)
        XCTAssertEqual(status.changedFiles, 0)
        XCTAssertTrue(status.isClean)
    }

    func testRepoMitAenderungenOhneUpstream() {
        let porcelain = """
        # branch.oid 22e5c03deadbeef
        # branch.head feature/git
        1 .M N... 100644 100644 100644 abc123 abc123 Willkommen.md
        1 A. N... 000000 100644 100644 000000 def456 Meine neue Notiz.md
        1 .D N... 100644 100644 000000 abc123 abc123 Weg.md
        2 R. N... 100644 100644 100644 abc123 abc123 R100 Neu2.md\tAlt.md
        u UU N... 100644 100644 100644 100644 abc123 def456 fedcba Konflikt.md
        ? Unversioniert.md
        """
        let status = GitStatusModel.parseStatus(porcelain)
        XCTAssertEqual(status.branch, "feature/git")
        XCTAssertNil(status.upstream)
        XCTAssertEqual(status.ahead, 0)
        XCTAssertEqual(status.behind, 0)
        XCTAssertEqual(status.changedFiles, 6)
        XCTAssertFalse(status.isClean)
        XCTAssertEqual(status.changes, [
            GitFileChange(path: "Willkommen.md", kind: .modified),
            GitFileChange(path: "Meine neue Notiz.md", kind: .added),
            GitFileChange(path: "Weg.md", kind: .deleted),
            GitFileChange(path: "Neu2.md", kind: .renamed),
            GitFileChange(path: "Konflikt.md", kind: .conflicted),
            GitFileChange(path: "Unversioniert.md", kind: .untracked),
        ])
    }
}

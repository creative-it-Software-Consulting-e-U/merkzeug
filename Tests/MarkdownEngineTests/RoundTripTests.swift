import XCTest
@testable import MarkdownEngine

/// Round-Trip: Markdown → AST → NSAttributedString → Markdown
/// Für kanonisch formatiertes Markdown muss das Ergebnis identisch sein.
final class RoundTripTests: XCTestCase {

    private func roundTrip(_ md: String) -> String {
        let blocks = MarkdownParser.parse(md)
        let attributed = AttributedBuilder(baseURL: nil).build(blocks)
        return MarkdownSerializer.markdown(from: attributed)
    }

    private func assertRoundTrip(_ md: String, file: StaticString = #filePath, line: UInt = #line) {
        let result = roundTrip(md)
        XCTAssertEqual(result.trimmingCharacters(in: .whitespacesAndNewlines),
                       md.trimmingCharacters(in: .whitespacesAndNewlines),
                       file: file, line: line)
    }

    func testHeadingsAndParagraph() {
        assertRoundTrip("""
        # Titel

        ## Untertitel

        Ein ganz normaler Absatz.
        """)
    }

    func testInlineFormatting() {
        assertRoundTrip("""
        Text mit **fett** und *kursiv* und ~~durchgestrichen~~ und `code` dazu.
        """)
    }

    func testLink() {
        assertRoundTrip("""
        Ein [Link](https://example.com) im Text.
        """)
    }

    func testImage() {
        assertRoundTrip("""
        Davor ![Alt-Text](Notiz.assets/bild.png) danach.
        """)
    }

    func testUnorderedListNested() {
        assertRoundTrip("""
        - Punkt eins
        - Punkt zwei
          - Unterpunkt
        - Punkt drei
        """)
    }

    func testOrderedList() {
        assertRoundTrip("""
        1. Eins
        2. Zwei
        3. Drei
        """)
    }

    func testQuote() {
        assertRoundTrip("""
        > Ein Zitat mit **fett** darin.
        """)
    }

    func testCodeBlock() {
        assertRoundTrip("""
        ```swift
        let x = 1
        print(x)
        ```
        """)
    }

    func testThematicBreak() {
        assertRoundTrip("""
        Oben

        ---

        Unten
        """)
    }

    func testTable() {
        assertRoundTrip("""
        | Name | Wert |
        | --- | --- |
        | Alpha | 1 |
        | Beta | 2 |
        """)
    }

    func testTableWithFormatting() {
        assertRoundTrip("""
        | Spalte |
        | --- |
        | **fett** und *kursiv* |
        """)
    }

    func testMixedDocument() {
        assertRoundTrip("""
        # Projekt

        Beschreibung mit [Doku](https://example.org) und `inline code`.

        ## Aufgaben

        - Erste Aufgabe
        - Zweite Aufgabe

        | Status | Anzahl |
        | --- | --- |
        | Offen | 3 |

        ```
        make build
        ```

        > Notiz am Rande.
        """)
    }

    func testBoldItalicCombination() {
        // Fett+kursiv zusammen: Ergebnis muss stabil sein (Fixpunkt nach 1 Runde)
        let result = roundTrip("Wort ***beides*** Ende.")
        XCTAssertTrue(result.contains("beides"))
        let again = roundTrip(result)
        XCTAssertEqual(result.trimmingCharacters(in: .whitespacesAndNewlines),
                       again.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    func testEscapedPipeInTable() {
        assertRoundTrip("""
        | A |
        | --- |
        | mit \\| Pipe |
        """)
    }

    func testEmptyDocument() {
        let result = roundTrip("")
        XCTAssertEqual(result.trimmingCharacters(in: .whitespacesAndNewlines), "")
    }
}

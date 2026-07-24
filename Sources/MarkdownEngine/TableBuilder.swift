import AppKit

/// Erzeugt NSTextTable-basierte Tabellen für den Editor.
public enum TableBuilder {

    /// Baut eine Tabelle aus Zellinhalten (Zeile 0 = Kopfzeile).
    /// Die Zellinhalte dürfen Inline-Formatierung enthalten; Absatzstile
    /// werden durch die Tabellenblöcke ersetzt.
    public static func attributedTable(cells: [[NSAttributedString]]) -> NSAttributedString {
        let result = NSMutableAttributedString()
        guard !cells.isEmpty else { return result }
        let cols = max(cells.map { $0.count }.max() ?? 1, 1)

        let table = NSTextTable()
        table.numberOfColumns = cols
        table.collapsesBorders = true
        table.hidesEmptyCells = false

        for (r, row) in cells.enumerated() {
            for c in 0..<cols {
                let block = NSTextTableBlock(table: table, startingRow: r, rowSpan: 1,
                                             startingColumn: c, columnSpan: 1)
                block.setBorderColor(Theme.tableBorderColor)
                block.setWidth(1, type: .absoluteValueType, for: .border)
                block.setWidth(6, type: .absoluteValueType, for: .padding)
                if r == 0 {
                    block.backgroundColor = Theme.tableHeaderBackground
                }

                let style = Theme.paragraphStyle(spacing: 0)
                style.textBlocks = [block]

                let cell = NSMutableAttributedString()
                if c < row.count {
                    cell.append(row[c])
                }
                if r == 0, cell.length > 0 {
                    // Kopfzeile fett darstellen
                    cell.enumerateAttribute(.font, in: NSRange(location: 0, length: cell.length)) { value, range, _ in
                        let f = (value as? NSFont) ?? Theme.body
                        let bold = NSFontManager.shared.convert(f, toHaveTrait: .boldFontMask)
                        cell.addAttribute(.font, value: bold, range: range)
                    }
                }
                cell.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))
                cell.addAttribute(.paragraphStyle, value: style, range: NSRange(location: 0, length: cell.length))
                cell.addAttribute(.mnBlockType, value: MNBlockType.paragraph.rawValue,
                                  range: NSRange(location: 0, length: cell.length))
                result.append(cell)
            }
        }
        return result
    }

    /// Leere Zelle mit Standardattributen.
    public static func emptyCell() -> NSAttributedString {
        NSAttributedString(string: "", attributes: Theme.bodyAttributes())
    }
}

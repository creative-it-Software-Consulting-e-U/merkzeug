import AppKit
import MarkdownEngine

// Formatierungs- und Tabellenbefehle des Editors.
extension MarkdownTextView {

    // MARK: - Inline-Formatierung

    func toggleBold() { toggleFontTrait(.boldFontMask) }
    func toggleItalic() { toggleFontTrait(.italicFontMask) }

    private func toggleFontTrait(_ trait: NSFontTraitMask) {
        let fm = NSFontManager.shared
        let r = selectedRange()
        if r.length == 0 {
            var attrs = typingAttributes
            let f = (attrs[.font] as? NSFont) ?? Theme.body
            let has = fm.traits(of: f).contains(trait)
            attrs[.font] = has ? fm.convert(f, toNotHaveTrait: trait) : fm.convert(f, toHaveTrait: trait)
            typingAttributes = attrs
            return
        }
        guard let ts = textStorage else { return }
        let firstFont = (ts.attribute(.font, at: r.location, effectiveRange: nil) as? NSFont) ?? Theme.body
        let add = !fm.traits(of: firstFont).contains(trait)
        changeAttributes(in: r) { storage in
            storage.enumerateAttribute(.font, in: r) { value, range, _ in
                let f = (value as? NSFont) ?? Theme.body
                let newFont = add ? fm.convert(f, toHaveTrait: trait) : fm.convert(f, toNotHaveTrait: trait)
                storage.addAttribute(.font, value: newFont, range: range)
            }
        }
    }

    func toggleStrikethrough() {
        let r = selectedRange()
        if r.length == 0 {
            var attrs = typingAttributes
            let has = ((attrs[.strikethroughStyle] as? NSNumber)?.intValue ?? 0) != 0
            if has {
                attrs.removeValue(forKey: .strikethroughStyle)
            } else {
                attrs[.strikethroughStyle] = NSNumber(value: NSUnderlineStyle.single.rawValue)
            }
            typingAttributes = attrs
            return
        }
        guard let ts = textStorage else { return }
        let has = ((ts.attribute(.strikethroughStyle, at: r.location, effectiveRange: nil) as? NSNumber)?.intValue ?? 0) != 0
        changeAttributes(in: r) { storage in
            if has {
                storage.removeAttribute(.strikethroughStyle, range: r)
            } else {
                storage.addAttribute(.strikethroughStyle,
                                     value: NSNumber(value: NSUnderlineStyle.single.rawValue), range: r)
            }
        }
    }

    func toggleInlineCode() {
        let r = selectedRange()
        if r.length == 0 {
            var attrs = typingAttributes
            if attrs[.mnInlineCode] != nil {
                attrs.removeValue(forKey: .mnInlineCode)
                attrs.removeValue(forKey: .backgroundColor)
                attrs[.font] = Theme.body
                attrs[.foregroundColor] = NSColor.labelColor
            } else {
                attrs[.mnInlineCode] = NSNumber(value: true)
                attrs[.backgroundColor] = Theme.inlineCodeBackground
                attrs[.font] = Theme.code
                attrs[.foregroundColor] = Theme.inlineCodeColor
            }
            typingAttributes = attrs
            return
        }
        guard let ts = textStorage else { return }
        let has = ts.attribute(.mnInlineCode, at: r.location, effectiveRange: nil) != nil
        changeAttributes(in: r) { storage in
            if has {
                storage.removeAttribute(.mnInlineCode, range: r)
                storage.removeAttribute(.backgroundColor, range: r)
                storage.addAttribute(.font, value: Theme.body, range: r)
                storage.addAttribute(.foregroundColor, value: NSColor.labelColor, range: r)
            } else {
                storage.addAttribute(.mnInlineCode, value: NSNumber(value: true), range: r)
                storage.addAttribute(.backgroundColor, value: Theme.inlineCodeBackground, range: r)
                storage.addAttribute(.font, value: Theme.code, range: r)
                storage.addAttribute(.foregroundColor, value: Theme.inlineCodeColor, range: r)
            }
        }
    }

    // MARK: - Blockformate

    /// level 0 = normaler Text, 1–6 = Überschrift.
    func setHeadingLevel(_ level: Int) {
        guard let ts = textStorage else { return }
        let sel = selectedRange()
        let pr = nsString.paragraphRange(for: sel)
        if pr.length == 0 {
            typingAttributes = level == 0 ? Theme.bodyAttributes() : Self.headingAttributes(level)
            return
        }
        if tableBlock(at: pr.location) != nil { return }

        let m = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
        stripAllListMarkers(m)
        let full = NSRange(location: 0, length: m.length)
        for key: NSAttributedString.Key in [.mnCodeBlockID, .mnCodeLanguage, .mnQuoteID,
                                            .mnInlineCode, .mnOrderedList, .backgroundColor] {
            m.removeAttribute(key, range: full)
        }
        let attrs = level == 0 ? Theme.bodyAttributes() : Self.headingAttributes(level)
        m.addAttribute(.paragraphStyle, value: attrs[.paragraphStyle]!, range: full)
        m.addAttribute(.mnBlockType, value: attrs[.mnBlockType]!, range: full)
        m.addAttribute(.foregroundColor, value: NSColor.labelColor, range: full)
        if level > 0 {
            m.addAttribute(.mnHeadingLevel, value: NSNumber(value: level), range: full)
        } else {
            m.removeAttribute(.mnHeadingLevel, range: full)
        }
        let font = level == 0 ? Theme.body : Theme.headingFont(level)
        m.enumerateAttribute(.attachment, in: full) { value, range, _ in
            if value == nil { m.addAttribute(.font, value: font, range: range) }
        }
        replaceWithUndo(pr, with: m)
        setSelectedRange(NSRange(location: pr.location + max(0, m.length - 1), length: 0))
        typingAttributes = attrs
    }

    static func headingAttributes(_ level: Int) -> [NSAttributedString.Key: Any] {
        [
            .font: Theme.headingFont(level),
            .foregroundColor: NSColor.labelColor,
            .paragraphStyle: Theme.headingParagraphStyle(level),
            .mnBlockType: MNBlockType.heading.rawValue,
            .mnHeadingLevel: NSNumber(value: level),
        ]
    }

    func toggleQuote(forceOn: Bool = false) {
        guard let ts = textStorage else { return }
        let pr = nsString.paragraphRange(for: selectedRange())
        if pr.length == 0 { return }
        if tableBlock(at: pr.location) != nil { return }
        let isQuote = blockType(at: pr.location) == .quote
        if isQuote, !forceOn {
            convertParagraphToBody(pr)
            return
        }
        let m = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
        stripAllListMarkers(m)
        let full = NSRange(location: 0, length: m.length)
        for key: NSAttributedString.Key in [.mnCodeBlockID, .mnCodeLanguage, .mnHeadingLevel,
                                            .mnOrderedList, .backgroundColor, .mnInlineCode] {
            m.removeAttribute(key, range: full)
        }
        m.addAttribute(.paragraphStyle, value: Theme.quoteParagraphStyle(), range: full)
        m.addAttribute(.mnBlockType, value: MNBlockType.quote.rawValue, range: full)
        m.addAttribute(.mnQuoteID, value: UUID().uuidString, range: full)
        m.addAttribute(.foregroundColor, value: Theme.quoteColor, range: full)
        m.enumerateAttribute(.attachment, in: full) { value, range, _ in
            if value == nil { m.addAttribute(.font, value: Theme.body, range: range) }
        }
        replaceWithUndo(pr, with: m)
        setSelectedRange(NSRange(location: pr.location + max(0, m.length - 1), length: 0))
    }

    func toggleCodeBlock() {
        guard let ts = textStorage else { return }
        let pr = nsString.paragraphRange(for: selectedRange())
        if pr.length == 0 {
            typingAttributes = Self.codeBlockAttributes(language: "")
            return
        }
        if tableBlock(at: pr.location) != nil { return }
        if blockType(at: pr.location) == .code {
            convertParagraphToBody(pr)
            return
        }
        let m = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
        stripAllListMarkers(m)
        let full = NSRange(location: 0, length: m.length)
        for key: NSAttributedString.Key in [.mnQuoteID, .mnHeadingLevel, .mnOrderedList,
                                            .mnInlineCode, .link] {
            m.removeAttribute(key, range: full)
        }
        let attrs = Self.codeBlockAttributes(language: "")
        for (key, value) in attrs {
            m.addAttribute(key, value: value, range: full)
        }
        replaceWithUndo(pr, with: m)
        setSelectedRange(NSRange(location: pr.location + max(0, m.length - 1), length: 0))
    }

    /// Entfernt Listen-Marker in allen Absätzen eines (kopierten) Teilstrings.
    private func stripAllListMarkers(_ m: NSMutableAttributedString) {
        let ns = m.string as NSString
        var loc = ns.length
        var ranges: [NSRange] = []
        loc = 0
        while loc < ns.length {
            let pr = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            let len = Self.markerPrefixLength(of: ns.substring(with: pr))
            if len > 0 { ranges.append(NSRange(location: pr.location, length: len)) }
            loc = NSMaxRange(pr)
        }
        for r in ranges.reversed() {
            m.deleteCharacters(in: r)
        }
    }

    // MARK: - Listen

    func setList(ordered: Bool, on: Bool? = nil) {
        guard let ts = textStorage else { return }
        let sel = selectedRange()
        let pr = nsString.paragraphRange(for: sel)
        if pr.length == 0 {
            // Leerer Absatz am Ende: Marker direkt einfügen
            var attrs = Theme.bodyAttributes()
            attrs[.paragraphStyle] = Theme.listParagraphStyle(depth: 1, ordered: ordered)
            attrs[.mnOrderedList] = NSNumber(value: ordered)
            let marker = ordered ? "1.\t" : "\(Theme.bulletMarker(depth: 1))\t"
            replaceWithUndo(NSRange(location: sel.location, length: 0),
                            with: NSAttributedString(string: marker, attributes: attrs))
            setSelectedRange(NSRange(location: sel.location + (marker as NSString).length, length: 0))
            typingAttributes = attrs
            return
        }
        if tableBlock(at: pr.location) != nil { return }

        let currentInfo = listInfo(at: nsString.paragraphRange(for: NSRange(location: pr.location, length: 0)))
        let alreadySame = currentInfo?.ordered == ordered && currentInfo != nil
        let turnOn = on ?? !alreadySame

        let m = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
        let ns = m.string as NSString
        var paragraphs: [NSRange] = []
        var loc = 0
        while loc < ns.length {
            let p = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if p.length == 0 { break }
            paragraphs.append(p)
            loc = NSMaxRange(p)
        }

        for p in paragraphs.reversed() {
            let text = (m.string as NSString).substring(with: p)
            let markerLen = Self.markerPrefixLength(of: text)
            let existingDepth = (m.attribute(.paragraphStyle, at: p.location, effectiveRange: nil) as? NSParagraphStyle)?
                .textLists.count ?? 0
            if markerLen > 0 {
                m.deleteCharacters(in: NSRange(location: p.location, length: markerLen))
            }
            let contentLen = p.length - markerLen
            let range = NSRange(location: p.location, length: contentLen)
            if turnOn {
                let depth = max(existingDepth, 1)
                let style = Theme.listParagraphStyle(depth: depth, ordered: ordered)
                m.addAttribute(.paragraphStyle, value: style, range: range)
                m.addAttribute(.mnOrderedList, value: NSNumber(value: ordered), range: range)
                m.addAttribute(.mnBlockType, value: MNBlockType.paragraph.rawValue, range: range)
                m.removeAttribute(.mnHeadingLevel, range: range)
                m.removeAttribute(.mnQuoteID, range: range)
                m.removeAttribute(.mnCodeBlockID, range: range)
                m.removeAttribute(.backgroundColor, range: range)
                m.addAttribute(.foregroundColor, value: NSColor.labelColor, range: range)
                var markerAttrs = Theme.bodyAttributes()
                markerAttrs[.paragraphStyle] = style
                markerAttrs[.mnOrderedList] = NSNumber(value: ordered)
                let marker = ordered ? "1.\t" : "\(Theme.bulletMarker(depth: depth))\t"
                m.insert(NSAttributedString(string: marker, attributes: markerAttrs), at: p.location)
                m.enumerateAttribute(.attachment, in: NSRange(location: p.location, length: contentLen + (marker as NSString).length)) { value, r, _ in
                    if value == nil, (m.attribute(.mnInlineCode, at: r.location, effectiveRange: nil) == nil) {
                        // Schrift der Überschrift zurücksetzen
                        if let f = m.attribute(.font, at: r.location, effectiveRange: nil) as? NSFont,
                           f.pointSize != Theme.bodySize {
                            m.addAttribute(.font, value: Theme.body, range: r)
                        }
                    }
                }
            } else {
                m.addAttribute(.paragraphStyle, value: Theme.paragraphStyle(), range: range)
                m.removeAttribute(.mnOrderedList, range: range)
            }
        }

        replaceWithUndo(pr, with: m)
        setSelectedRange(NSRange(location: pr.location + max(0, m.length - 1), length: 0))
        if turnOn && ordered { renumberOrderedLists() }
        typingAttributes = Theme.bodyAttributes()
    }

    func changeListIndent(by delta: Int) {
        guard let ts = textStorage else { return }
        let pr = nsString.paragraphRange(for: selectedRange())
        guard pr.length > 0 else { return }
        var caret = selectedRange().location

        for p in paragraphRanges(in: pr).reversed() {
            guard let li = listInfo(at: p) else { continue }
            let newDepth = min(max(li.depth + delta, 1), 6)
            guard newDepth != li.depth else { continue }
            let style = Theme.listParagraphStyle(depth: newDepth, ordered: li.ordered)
            changeAttributes(in: p) { storage in
                storage.addAttribute(.paragraphStyle, value: style, range: p)
            }
            if !li.ordered, li.markerRange.length > 0 {
                let newMarker = "\(Theme.bulletMarker(depth: newDepth))\t"
                let old = nsString.substring(with: li.markerRange)
                if old != newMarker {
                    var attrs = ts.attributes(at: li.markerRange.location, effectiveRange: nil)
                    attrs[.paragraphStyle] = style
                    replaceWithUndo(li.markerRange, with: NSAttributedString(string: newMarker, attributes: attrs))
                    caret += (newMarker as NSString).length - li.markerRange.length
                }
            }
        }
        setSelectedRange(NSRange(location: min(caret, nsString.length), length: 0))
        renumberOrderedLists()
    }

    /// Nummeriert alle geordneten Listen im Dokument neu.
    func renumberOrderedLists() {
        guard let ts = textStorage else { return }
        var edits: [(NSRange, String)] = []
        var counters: [Int: Int] = [:]
        var lastDepth = 0
        var loc = 0
        let ns = nsString
        while loc < ns.length {
            let pr = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            loc = NSMaxRange(pr)
            guard let li = listInfo(at: pr) else {
                counters = [:]
                lastDepth = 0
                continue
            }
            if li.depth < lastDepth {
                for d in counters.keys where d > li.depth { counters.removeValue(forKey: d) }
            }
            lastDepth = li.depth
            guard li.ordered else { continue }
            let n = (counters[li.depth] ?? 0) + 1
            counters[li.depth] = n
            let expected = "\(n).\t"
            if li.markerRange.length > 0 {
                let actual = ns.substring(with: li.markerRange)
                if actual != expected {
                    edits.append((li.markerRange, expected))
                }
            }
        }
        guard !edits.isEmpty else { return }
        let caret = selectedRange().location
        var caretShift = 0
        for (range, text) in edits.reversed() {
            guard shouldChangeText(in: range, replacementString: text) else { continue }
            ts.replaceCharacters(in: range, with: text)
            didChangeText()
            if range.location < caret {
                caretShift += (text as NSString).length - range.length
            }
        }
        setSelectedRange(NSRange(location: max(0, min(caret + caretShift, nsString.length)), length: 0))
    }

    // MARK: - Trennlinie

    func insertHorizontalRule() {
        let sel = selectedRange()
        let pr = nsString.paragraphRange(for: sel)
        let insertAt = pr.length > 0 ? NSMaxRange(pr) : sel.location
        let style = Theme.paragraphStyle(spacingBefore: 8, spacing: 8)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: Theme.body,
            .foregroundColor: Theme.hrColor,
            .paragraphStyle: style,
            .mnBlockType: MNBlockType.hr.rawValue,
        ]
        let hr = NSMutableAttributedString(string: String(repeating: "─", count: 40) + "\n", attributes: attrs)
        hr.append(NSAttributedString(string: "", attributes: Theme.bodyAttributes()))
        replaceWithUndo(NSRange(location: insertAt, length: 0), with: hr)
        setSelectedRange(NSRange(location: insertAt + hr.length, length: 0))
        typingAttributes = Theme.bodyAttributes()
    }

    // MARK: - Links

    /// Aktuelle Link-Auswahl (für das Link-Sheet).
    func currentLinkContext() -> (text: String, url: String, range: NSRange) {
        guard let ts = textStorage else { return ("", "", selectedRange()) }
        var r = selectedRange()
        if r.length == 0, ts.length > 0 {
            let i = min(r.location, ts.length - 1)
            var effective = NSRange(location: 0, length: 0)
            if ts.attribute(.link, at: i, longestEffectiveRange: &effective,
                            in: NSRange(location: 0, length: ts.length)) != nil {
                r = effective
            }
        }
        var url = ""
        if r.length > 0, r.location < ts.length,
           let v = ts.attribute(.link, at: r.location, effectiveRange: nil) {
            url = (v as? URL)?.absoluteString ?? "\(v)"
        }
        let text = r.length > 0 ? nsString.substring(with: r).replacingOccurrences(of: "\n", with: "") : ""
        return (text, url, r)
    }

    func applyLink(text: String, url: String, range: NSRange) {
        let cleanText = text.isEmpty ? url : text
        guard !cleanText.isEmpty else { return }
        var attrs = range.length > 0 && range.location < (textStorage?.length ?? 0)
            ? (textStorage?.attributes(at: range.location, effectiveRange: nil) ?? Theme.bodyAttributes())
            : typingAttributes
        attrs.removeValue(forKey: .attachment)
        attrs.removeValue(forKey: .mnImagePath)
        attrs.removeValue(forKey: .mnImageAlt)
        if url.isEmpty {
            attrs.removeValue(forKey: .link)
        } else {
            attrs[.link] = url
        }
        let replacement = NSAttributedString(string: cleanText, attributes: attrs)
        replaceWithUndo(range, with: replacement)
        setSelectedRange(NSRange(location: range.location + replacement.length, length: 0))
        var typing = typingAttributes
        typing.removeValue(forKey: .link)
        typingAttributes = typing
    }

    // MARK: - Tabellen

    struct TableInfo {
        var range: NSRange
        var table: NSTextTable
        var cells: [[NSAttributedString]]
        var rows: Int
        var cols: Int
        var caretRow: Int
        var caretCol: Int
    }

    func tableInfo(at index: Int) -> TableInfo? {
        guard let ts = textStorage, let caretBlock = tableBlock(at: index) else { return nil }
        let table = caretBlock.table
        let ns = nsString

        var start = ns.paragraphRange(for: NSRange(location: index, length: 0)).location
        while start > 0 {
            let prevPr = ns.paragraphRange(for: NSRange(location: start - 1, length: 0))
            if let b = tableBlock(at: prevPr.location), b.table === table {
                start = prevPr.location
            } else {
                break
            }
        }
        var end = NSMaxRange(ns.paragraphRange(for: NSRange(location: index, length: 0)))
        while end < ns.length {
            if let b = tableBlock(at: end), b.table === table {
                end = NSMaxRange(ns.paragraphRange(for: NSRange(location: end, length: 0)))
            } else {
                break
            }
        }

        var cellMap: [Int: [Int: NSMutableAttributedString]] = [:]
        var maxRow = 0
        var maxCol = 0
        var loc = start
        while loc < end {
            let pr = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            loc = NSMaxRange(pr)
            guard let b = tableBlock(at: pr.location) else { continue }
            let row = b.startingRow
            let col = b.startingColumn
            maxRow = max(maxRow, row)
            maxCol = max(maxCol, col)
            let content = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
            if content.string.hasSuffix("\n") {
                content.deleteCharacters(in: NSRange(location: content.length - 1, length: 1))
            }
            if let existing = cellMap[row]?[col] {
                // Mehrere Absätze in einer Zelle: mit Leerzeichen verbinden
                if content.length > 0 {
                    if existing.length > 0 {
                        existing.append(NSAttributedString(string: " ", attributes: Theme.bodyAttributes()))
                    }
                    existing.append(content)
                }
            } else {
                cellMap[row, default: [:]][col] = content
            }
        }

        let rows = maxRow + 1
        let cols = max(maxCol + 1, table.numberOfColumns)
        var cells: [[NSAttributedString]] = []
        for r in 0..<rows {
            var rowCells: [NSAttributedString] = []
            for c in 0..<cols {
                rowCells.append(cellMap[r]?[c] ?? NSMutableAttributedString())
            }
            cells.append(rowCells)
        }
        return TableInfo(range: NSRange(location: start, length: end - start),
                         table: table, cells: cells, rows: rows, cols: cols,
                         caretRow: caretBlock.startingRow, caretCol: caretBlock.startingColumn)
    }

    private func rebuildTable(_ info: TableInfo, cells: [[NSAttributedString]],
                              selectRow: Int, selectCol: Int) {
        guard !cells.isEmpty, !cells[0].isEmpty else {
            // Tabelle komplett entfernen
            replaceWithUndo(info.range, with: NSAttributedString(string: "", attributes: Theme.bodyAttributes()))
            setSelectedRange(NSRange(location: info.range.location, length: 0))
            typingAttributes = Theme.bodyAttributes()
            return
        }
        let newTable = TableBuilder.attributedTable(cells: cells)
        replaceWithUndo(info.range, with: newTable)
        selectCell(tableStart: info.range.location, row: selectRow, col: selectCol,
                   cols: cells[0].count)
    }

    private func selectCell(tableStart: Int, row: Int, col: Int, cols: Int) {
        let ns = nsString
        var loc = tableStart
        var idx = 0
        let target = row * cols + col
        while loc < ns.length {
            let pr = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            guard tableBlock(at: pr.location) != nil else { break }
            if idx == target {
                let contentLen = max(0, pr.length - 1)
                setSelectedRange(NSRange(location: pr.location + contentLen, length: 0))
                return
            }
            idx += 1
            loc = NSMaxRange(pr)
        }
        setSelectedRange(NSRange(location: min(tableStart, ns.length), length: 0))
    }

    func moveToAdjacentCell(forward: Bool) {
        let sel = selectedRange().location
        guard let info = tableInfo(at: sel) else { return }
        var r = info.caretRow
        var c = info.caretCol + (forward ? 1 : -1)
        if c >= info.cols { c = 0; r += 1 }
        if c < 0 { c = info.cols - 1; r -= 1 }
        if r < 0 {
            setSelectedRange(NSRange(location: max(0, info.range.location - 1), length: 0))
            return
        }
        if r >= info.rows {
            // Am Ende: neue Zeile anhängen (Notion-Verhalten)
            var cells = info.cells
            cells.append((0..<info.cols).map { _ in NSAttributedString() })
            rebuildTable(info, cells: cells, selectRow: info.rows, selectCol: 0)
            return
        }
        selectCell(tableStart: info.range.location, row: r, col: c, cols: info.cols)
    }

    func insertTable(rows: Int = 3, cols: Int = 3) {
        let sel = selectedRange()
        let pr = nsString.paragraphRange(for: sel)
        let insertAt = pr.length > 0 ? NSMaxRange(pr) : sel.location
        var cells: [[NSAttributedString]] = []
        var header: [NSAttributedString] = []
        for c in 0..<cols {
            header.append(NSAttributedString(string: "Spalte \(c + 1)", attributes: Theme.bodyAttributes()))
        }
        cells.append(header)
        for _ in 1..<max(rows, 2) {
            cells.append((0..<cols).map { _ in NSAttributedString() })
        }
        let content = NSMutableAttributedString()
        content.append(TableBuilder.attributedTable(cells: cells))
        content.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))
        replaceWithUndo(NSRange(location: insertAt, length: 0), with: content)
        selectCell(tableStart: insertAt, row: 0, col: 0, cols: cols)
    }

    @objc func tableInsertRowBelow(_ sender: Any?) { tableInsertRow(offset: 1) }
    @objc func tableInsertRowAbove(_ sender: Any?) { tableInsertRow(offset: 0) }

    private func tableInsertRow(offset: Int) {
        guard let info = tableInfo(at: selectedRange().location) else { return }
        var cells = info.cells
        let newRow = (0..<info.cols).map { _ in NSAttributedString() }
        let index = min(info.caretRow + offset, cells.count)
        cells.insert(newRow, at: index)
        rebuildTable(info, cells: cells, selectRow: index, selectCol: 0)
    }

    @objc func tableInsertColumnRight(_ sender: Any?) { tableInsertColumn(offset: 1) }
    @objc func tableInsertColumnLeft(_ sender: Any?) { tableInsertColumn(offset: 0) }

    private func tableInsertColumn(offset: Int) {
        guard let info = tableInfo(at: selectedRange().location) else { return }
        var cells = info.cells
        let index = min(info.caretCol + offset, info.cols)
        for r in 0..<cells.count {
            cells[r].insert(NSAttributedString(), at: index)
        }
        rebuildTable(info, cells: cells, selectRow: info.caretRow, selectCol: index)
    }

    @objc func tableDeleteRow(_ sender: Any?) {
        guard let info = tableInfo(at: selectedRange().location) else { return }
        var cells = info.cells
        guard cells.count > 1 else { tableDeleteWhole(sender); return }
        cells.remove(at: info.caretRow)
        rebuildTable(info, cells: cells, selectRow: min(info.caretRow, cells.count - 1), selectCol: info.caretCol)
    }

    @objc func tableDeleteColumn(_ sender: Any?) {
        guard let info = tableInfo(at: selectedRange().location) else { return }
        var cells = info.cells
        guard info.cols > 1 else { tableDeleteWhole(sender); return }
        for r in 0..<cells.count {
            if info.caretCol < cells[r].count {
                cells[r].remove(at: info.caretCol)
            }
        }
        rebuildTable(info, cells: cells, selectRow: info.caretRow,
                     selectCol: min(info.caretCol, info.cols - 2))
    }

    @objc func tableDeleteWhole(_ sender: Any?) {
        guard let info = tableInfo(at: selectedRange().location) else { return }
        replaceWithUndo(info.range, with: NSAttributedString(string: "", attributes: Theme.bodyAttributes()))
        setSelectedRange(NSRange(location: info.range.location, length: 0))
        typingAttributes = Theme.bodyAttributes()
    }
}

import AppKit

/// Wandelt den Editor-Inhalt (NSAttributedString) zurück in Markdown.
public enum MarkdownSerializer {

    public static func markdown(from attributed: NSAttributedString) -> String {
        let ns = attributed.string as NSString
        var chunks: [String] = []

        // Gruppierungs-Zustände
        var tableState: (table: NSTextTable, cells: [Int: [Int: String]])? = nil
        var codeState: (id: String, language: String, lines: [String])? = nil
        var quoteState: (id: String, lines: [String])? = nil
        var listLines: [String] = []
        var orderedCounters: [Int: Int] = [:]
        var lastListDepth = 0

        func flushTable() {
            guard let state = tableState else { return }
            tableState = nil
            let rowIndices = state.cells.keys.sorted()
            guard let maxCol = state.cells.values.flatMap({ $0.keys }).max() else { return }
            var lines: [String] = []
            for (i, r) in rowIndices.enumerated() {
                let row = state.cells[r] ?? [:]
                let cells = (0...maxCol).map { row[$0] ?? "" }
                lines.append("| " + cells.joined(separator: " | ") + " |")
                if i == 0 {
                    lines.append("| " + Array(repeating: "---", count: maxCol + 1).joined(separator: " | ") + " |")
                }
            }
            chunks.append(lines.joined(separator: "\n"))
        }

        func flushCode() {
            guard let state = codeState else { return }
            codeState = nil
            var lines = state.lines
            while let last = lines.last, last.isEmpty { lines.removeLast() }
            let fence = "```" + state.language
            chunks.append(([fence] + lines + ["```"]).joined(separator: "\n"))
        }

        func flushQuote() {
            guard let state = quoteState else { return }
            quoteState = nil
            chunks.append(state.lines.map { $0.isEmpty ? ">" : "> \($0)" }.joined(separator: "\n"))
        }

        func flushList() {
            guard !listLines.isEmpty else { return }
            chunks.append(listLines.joined(separator: "\n"))
            listLines = []
            orderedCounters = [:]
            lastListDepth = 0
        }

        func flushAll() {
            flushTable(); flushCode(); flushQuote(); flushList()
        }

        var loc = 0
        while loc < ns.length {
            let pr = ns.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            loc = NSMaxRange(pr)

            let attrs = attributed.attributes(at: pr.location, effectiveRange: nil)
            let style = attrs[.paragraphStyle] as? NSParagraphStyle

            // Tabelle?
            if let block = style?.textBlocks.first as? NSTextTableBlock {
                flushCode(); flushQuote(); flushList()
                if tableState == nil || tableState!.table !== block.table {
                    flushTable()
                    tableState = (block.table, [:])
                }
                let text = inlineMarkdown(attributed, range: pr, suppressBold: block.startingRow == 0, escapePipes: true)
                var row = tableState!.cells[block.startingRow] ?? [:]
                if let existing = row[block.startingColumn], !existing.isEmpty {
                    row[block.startingColumn] = text.isEmpty ? existing : existing + " " + text
                } else {
                    row[block.startingColumn] = text
                }
                tableState!.cells[block.startingRow] = row
                continue
            }
            flushTable()

            let blockType = MNBlockType(rawValue: (attrs[.mnBlockType] as? String) ?? "") ?? .paragraph

            // Codeblock?
            if blockType == .code, let id = attrs[.mnCodeBlockID] as? String {
                flushQuote(); flushList()
                let lang = (attrs[.mnCodeLanguage] as? String) ?? ""
                if codeState == nil || codeState!.id != id {
                    flushCode()
                    codeState = (id, lang, [])
                }
                var line = ns.substring(with: pr)
                if line.hasSuffix("\n") { line.removeLast() }
                codeState!.lines.append(line)
                continue
            }
            flushCode()

            // Zitat?
            if blockType == .quote, let id = attrs[.mnQuoteID] as? String {
                flushList()
                if quoteState == nil || quoteState!.id != id {
                    flushQuote()
                    quoteState = (id, [])
                }
                quoteState!.lines.append(inlineMarkdown(attributed, range: pr))
                continue
            }
            flushQuote()

            // Liste?
            if let lists = style?.textLists, !lists.isEmpty {
                let depth = lists.count
                let ordered = (attrs[.mnOrderedList] as? NSNumber)?.boolValue
                    ?? lists.last!.markerFormat.rawValue.contains("decimal")
                var text = inlineMarkdown(attributed, range: pr)
                text = stripListMarker(text)
                if depth > lastListDepth {
                    orderedCounters[depth] = 0
                } else if depth < lastListDepth {
                    for d in orderedCounters.keys where d > depth { orderedCounters.removeValue(forKey: d) }
                }
                lastListDepth = depth
                let indent = String(repeating: "  ", count: depth - 1)
                if ordered {
                    let n = (orderedCounters[depth] ?? 0) + 1
                    orderedCounters[depth] = n
                    listLines.append("\(indent)\(n). \(text)")
                } else {
                    listLines.append("\(indent)- \(text)")
                }
                continue
            }
            flushList()

            switch blockType {
            case .hr:
                chunks.append("---")
            case .heading:
                let level = (attrs[.mnHeadingLevel] as? NSNumber)?.intValue ?? 1
                let text = inlineMarkdown(attributed, range: pr, suppressBold: true)
                chunks.append(String(repeating: "#", count: min(max(level, 1), 6)) + " " + text)
            default:
                let text = inlineMarkdown(attributed, range: pr)
                if !text.trimmingCharacters(in: .whitespaces).isEmpty {
                    chunks.append(text)
                }
            }
        }
        flushAll()

        var result = chunks.joined(separator: "\n\n")
        if !result.isEmpty { result += "\n" }
        return result
    }

    // MARK: - Inline

    /// Entfernt ein führendes Listen-Markerpaar ("•\t", "◦\t", "▪\t", "1.\t").
    private static func stripListMarker(_ s: String) -> String {
        for bullet in ["•", "◦", "▪"] {
            if s.hasPrefix(bullet + "\t") {
                return String(s.dropFirst(bullet.count + 1))
            }
        }
        var idx = s.startIndex
        var digits = 0
        while idx < s.endIndex, s[idx].isNumber, digits < 10 { digits += 1; idx = s.index(after: idx) }
        if digits > 0, idx < s.endIndex, s[idx] == "." {
            let afterDot = s.index(after: idx)
            if afterDot < s.endIndex, s[afterDot] == "\t" {
                return String(s[s.index(after: afterDot)...])
            }
        }
        return s
    }

    static func inlineMarkdown(_ attributed: NSAttributedString,
                               range: NSRange,
                               suppressBold: Bool = false,
                               escapePipes: Bool = false) -> String {
        let ns = attributed.string as NSString
        var out = ""

        attributed.enumerateAttributes(in: range, options: []) { attrs, runRange, _ in
            // Bild-Attachment
            if attrs[.attachment] != nil {
                let path = (attrs[.mnImagePath] as? String) ?? ""
                let alt = (attrs[.mnImageAlt] as? String) ?? ""
                if !path.isEmpty {
                    out += "![\(alt)](\(path))"
                }
                return
            }

            var s = ns.substring(with: runRange)
            s = s.replacingOccurrences(of: "\n", with: "")
            s = s.replacingOccurrences(of: "\u{FFFC}", with: "")
            if escapePipes { s = s.replacingOccurrences(of: "|", with: "\\|") }
            if s.isEmpty { return }

            // Inline-Code: keine weitere Formatierung darin
            if attrs[.mnInlineCode] != nil {
                let (lead, core, trail) = splitWhitespace(s)
                if core.isEmpty { out += s } else { out += "\(lead)`\(core)`\(trail)" }
                return
            }

            let font = attrs[.font] as? NSFont
            let traits: NSFontTraitMask = font.map { NSFontManager.shared.traits(of: $0) } ?? []
            let bold = traits.contains(.boldFontMask) && !suppressBold
            let italic = traits.contains(.italicFontMask)
            let strike = ((attrs[.strikethroughStyle] as? NSNumber)?.intValue ?? 0) != 0

            let (lead, core, trail) = splitWhitespace(s)
            if core.isEmpty {
                out += s
                return
            }

            var marked = core
            if italic { marked = "*\(marked)*" }
            if bold { marked = "**\(marked)**" }
            if strike { marked = "~~\(marked)~~" }

            if let link = attrs[.link] {
                let url = (link as? URL)?.absoluteString ?? "\(link)"
                marked = "[\(marked)](\(url))"
            }
            out += lead + marked + trail
        }
        return out
    }

    /// Trennt führenden/nachlaufenden Whitespace ab, damit Marker eng anliegen.
    private static func splitWhitespace(_ s: String) -> (String, String, String) {
        var start = s.startIndex
        var end = s.endIndex
        while start < end, s[start] == " " || s[start] == "\t" { start = s.index(after: start) }
        while end > start, s[s.index(before: end)] == " " || s[s.index(before: end)] == "\t" {
            end = s.index(before: end)
        }
        return (String(s[..<start]), String(s[start..<end]), String(s[end...]))
    }
}

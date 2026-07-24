import Foundation

/// Zeilenbasierter Parser für ein GFM-Subset: Überschriften, Absätze,
/// Codeblöcke, Zitate, (verschachtelte) Listen, Tabellen, Trennlinien,
/// sowie Inline-Formatierung (fett, kursiv, durchgestrichen, Code, Links, Bilder).
public enum MarkdownParser {

    public static func parse(_ text: String) -> [MDBlock] {
        let normalized = text.replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
        let lines = normalized.components(separatedBy: "\n")
        var blocks: [MDBlock] = []
        var i = 0

        while i < lines.count {
            let line = lines[i]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.isEmpty { i += 1; continue }

            // Codeblock ```
            if trimmed.hasPrefix("```") {
                let lang = String(trimmed.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                var body: [String] = []
                i += 1
                while i < lines.count, !lines[i].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                    body.append(lines[i])
                    i += 1
                }
                if i < lines.count { i += 1 } // schließender Fence
                blocks.append(.codeBlock(language: lang, text: body.joined(separator: "\n")))
                continue
            }

            // Überschrift
            if let (level, rest) = headingPrefix(trimmed) {
                blocks.append(.heading(level: level, inlines: parseInlines(rest)))
                i += 1
                continue
            }

            // Trennlinie
            if isThematicBreak(trimmed) {
                blocks.append(.thematicBreak)
                i += 1
                continue
            }

            // Tabelle: Zeile mit '|' gefolgt von Separator-Zeile
            if trimmed.contains("|"), i + 1 < lines.count,
               isTableSeparator(lines[i + 1].trimmingCharacters(in: .whitespaces)) {
                var rows: [[[MDInline]]] = []
                rows.append(tableCells(trimmed).map { parseInlines($0) })
                i += 2
                while i < lines.count {
                    let t = lines[i].trimmingCharacters(in: .whitespaces)
                    if t.isEmpty || !t.contains("|") { break }
                    rows.append(tableCells(t).map { parseInlines($0) })
                    i += 1
                }
                blocks.append(.table(rows: rows))
                continue
            }

            // Zitat
            if trimmed.hasPrefix(">") {
                var paragraphs: [[MDInline]] = []
                var current: [String] = []
                while i < lines.count {
                    let t = lines[i].trimmingCharacters(in: .whitespaces)
                    guard t.hasPrefix(">") else { break }
                    var content = String(t.dropFirst())
                    if content.hasPrefix(" ") { content.removeFirst() }
                    if content.trimmingCharacters(in: .whitespaces).isEmpty {
                        if !current.isEmpty { paragraphs.append(parseInlines(current.joined(separator: " "))); current = [] }
                    } else {
                        current.append(content)
                    }
                    i += 1
                }
                if !current.isEmpty { paragraphs.append(parseInlines(current.joined(separator: " "))) }
                if !paragraphs.isEmpty { blocks.append(.quote(paragraphs: paragraphs)) }
                continue
            }

            // Listenpunkt
            if let item = listItemPrefix(line) {
                blocks.append(.listItem(depth: item.depth, ordered: item.ordered,
                                        number: item.number, inlines: parseInlines(item.content)))
                i += 1
                continue
            }

            // Absatz: aufeinanderfolgende "normale" Zeilen zusammenfassen
            var paraLines: [String] = [trimmed]
            i += 1
            while i < lines.count {
                let t = lines[i].trimmingCharacters(in: .whitespaces)
                if t.isEmpty || t.hasPrefix("#") || t.hasPrefix(">") || t.hasPrefix("```")
                    || isThematicBreak(t) || listItemPrefix(lines[i]) != nil
                    || (t.contains("|") && i + 1 < lines.count && isTableSeparator(lines[i + 1].trimmingCharacters(in: .whitespaces))) {
                    break
                }
                paraLines.append(t)
                i += 1
            }
            blocks.append(.paragraph(parseInlines(paraLines.joined(separator: " "))))
        }
        return blocks
    }

    // MARK: - Block-Hilfen

    private static func headingPrefix(_ s: String) -> (Int, String)? {
        guard s.hasPrefix("#") else { return nil }
        var level = 0
        var idx = s.startIndex
        while idx < s.endIndex, s[idx] == "#", level < 7 { level += 1; idx = s.index(after: idx) }
        guard level >= 1, level <= 6 else { return nil }
        guard idx < s.endIndex, s[idx] == " " else {
            // "#" allein: leere Überschrift zulassen
            return idx == s.endIndex ? (level, "") : nil
        }
        return (level, String(s[s.index(after: idx)...]).trimmingCharacters(in: .whitespaces))
    }

    private static func isThematicBreak(_ s: String) -> Bool {
        guard s.count >= 3 else { return false }
        for ch: Character in ["-", "*", "_"] {
            if s.allSatisfy({ $0 == ch || $0 == " " }), s.filter({ $0 == ch }).count >= 3 {
                return true
            }
        }
        return false
    }

    private static func isTableSeparator(_ s: String) -> Bool {
        guard s.contains("-"), s.contains("|") || s.hasPrefix(":") || s.hasPrefix("-") else { return false }
        let allowed = Set<Character>("|-: \t")
        return !s.isEmpty && s.allSatisfy { allowed.contains($0) }
    }

    private static func tableCells(_ line: String) -> [String] {
        var s = line
        if s.hasPrefix("|") { s.removeFirst() }
        if s.hasSuffix("|") { s.removeLast() }
        // Split an nicht-escapten Pipes
        var cells: [String] = []
        var current = ""
        var escaped = false
        for ch in s {
            if escaped {
                if ch != "|" { current.append("\\") }
                current.append(ch)
                escaped = false
            } else if ch == "\\" {
                escaped = true
            } else if ch == "|" {
                cells.append(current.trimmingCharacters(in: .whitespaces))
                current = ""
            } else {
                current.append(ch)
            }
        }
        if escaped { current.append("\\") }
        cells.append(current.trimmingCharacters(in: .whitespaces))
        return cells
    }

    private static func listItemPrefix(_ line: String) -> (depth: Int, ordered: Bool, number: Int, content: String)? {
        var indent = 0
        var idx = line.startIndex
        while idx < line.endIndex {
            if line[idx] == " " { indent += 1 } else if line[idx] == "\t" { indent += 4 } else { break }
            idx = line.index(after: idx)
        }
        guard idx < line.endIndex else { return nil }
        let depth = min(indent / 2 + 1, 6)
        let rest = String(line[idx...])

        // Ungeordnete Liste
        if let first = rest.first, "-*+".contains(first) {
            let after = rest.dropFirst()
            if after.first == " " {
                return (depth, false, 0, String(after.dropFirst()))
            }
            return nil
        }
        // Geordnete Liste: 1. / 1)
        var digits = ""
        var j = rest.startIndex
        while j < rest.endIndex, rest[j].isNumber, digits.count < 9 {
            digits.append(rest[j]); j = rest.index(after: j)
        }
        guard !digits.isEmpty, j < rest.endIndex, rest[j] == "." || rest[j] == ")" else { return nil }
        let afterDot = rest.index(after: j)
        guard afterDot < rest.endIndex, rest[afterDot] == " " else { return nil }
        let content = String(rest[rest.index(after: afterDot)...])
        return (depth, true, Int(digits) ?? 1, content)
    }

    // MARK: - Inline-Parser

    public static func parseInlines(_ s: String) -> [MDInline] {
        var out: [MDInline] = []
        var text = ""
        let ch = Array(s)
        var i = 0

        func flush() {
            if !text.isEmpty { out.append(.text(text)); text = "" }
        }
        func find(_ token: [Character], from: Int) -> Int? {
            guard !token.isEmpty else { return nil }
            var j = from
            while j + token.count <= ch.count {
                var match = true
                for k in 0..<token.count where ch[j + k] != token[k] { match = false; break }
                if match { return j }
                j += 1
            }
            return nil
        }

        while i < ch.count {
            let c = ch[i]

            if c == "\\", i + 1 < ch.count {
                text.append(ch[i + 1]); i += 2; continue
            }

            if c == "`" {
                if let close = find(["`"], from: i + 1) {
                    flush()
                    out.append(.code(String(ch[(i + 1)..<close])))
                    i = close + 1
                    continue
                }
            }

            if c == "!", i + 1 < ch.count, ch[i + 1] == "[" {
                if let cb = find(["]"], from: i + 2), cb + 1 < ch.count, ch[cb + 1] == "(",
                   let cp = find([")"], from: cb + 2) {
                    let alt = String(ch[(i + 2)..<cb])
                    let target = linkTarget(String(ch[(cb + 2)..<cp]))
                    flush()
                    out.append(.image(alt: alt, path: target))
                    i = cp + 1
                    continue
                }
            }

            if c == "[" {
                if let cb = find(["]"], from: i + 1), cb + 1 < ch.count, ch[cb + 1] == "(",
                   let cp = find([")"], from: cb + 2) {
                    let inner = String(ch[(i + 1)..<cb])
                    let target = linkTarget(String(ch[(cb + 2)..<cp]))
                    flush()
                    out.append(.link(text: parseInlines(inner), url: target))
                    i = cp + 1
                    continue
                }
            }

            // Fett: ** oder __
            if (c == "*" || c == "_"), i + 1 < ch.count, ch[i + 1] == c {
                if let close = find([c, c], from: i + 2), close > i + 2 {
                    let inner = String(ch[(i + 2)..<close])
                    flush()
                    out.append(.strong(parseInlines(inner)))
                    i = close + 2
                    continue
                }
            }

            // Durchgestrichen: ~~
            if c == "~", i + 1 < ch.count, ch[i + 1] == "~" {
                if let close = find(["~", "~"], from: i + 2), close > i + 2 {
                    let inner = String(ch[(i + 2)..<close])
                    flush()
                    out.append(.strikethrough(parseInlines(inner)))
                    i = close + 2
                    continue
                }
            }

            // Kursiv: * oder _
            if c == "*" || c == "_" {
                if let close = find([c], from: i + 1), close > i + 1 {
                    let inner = String(ch[(i + 1)..<close])
                    if !inner.trimmingCharacters(in: .whitespaces).isEmpty {
                        flush()
                        out.append(.emphasis(parseInlines(inner)))
                        i = close + 1
                        continue
                    }
                }
            }

            text.append(c)
            i += 1
        }
        flush()
        return out
    }

    /// Entfernt optionalen Titel und <>-Klammern aus einem Link-Ziel.
    private static func linkTarget(_ raw: String) -> String {
        var t = raw.trimmingCharacters(in: .whitespaces)
        if t.hasPrefix("<"), t.hasSuffix(">"), t.count >= 2 {
            t = String(t.dropFirst().dropLast())
        }
        if let spaceIdx = t.firstIndex(of: " ") {
            let rest = t[t.index(after: spaceIdx)...].trimmingCharacters(in: .whitespaces)
            if rest.hasPrefix("\"") || rest.hasPrefix("'") {
                t = String(t[..<spaceIdx])
            }
        }
        return t
    }
}

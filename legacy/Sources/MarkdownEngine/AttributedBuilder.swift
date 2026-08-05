import AppKit

/// Baut aus dem Markdown-AST einen NSAttributedString für den WYSIWYG-Editor.
public struct AttributedBuilder {
    /// Verzeichnis der Markdown-Datei — Basis für relative Bildpfade.
    public let baseURL: URL?

    public init(baseURL: URL?) {
        self.baseURL = baseURL
    }

    struct InlineContext {
        var bold = false
        var italic = false
        var strike = false
        var headingLevel: Int? = nil
        var color: NSColor = .labelColor
    }

    public func build(_ blocks: [MDBlock]) -> NSAttributedString {
        let result = NSMutableAttributedString()
        for block in blocks {
            append(block, to: result)
        }
        // Nach Tabellen/Codeblöcken am Dokumentende einen normalen Absatz anhängen,
        // damit der Cursor dahinter platziert werden kann.
        if let last = blocks.last {
            switch last {
            case .table, .codeBlock:
                result.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))
            default:
                break
            }
        }
        if result.length == 0 {
            result.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))
        }
        return result
    }

    private func append(_ block: MDBlock, to result: NSMutableAttributedString) {
        switch block {
        case let .heading(level, inlines):
            var attrs: [NSAttributedString.Key: Any] = [
                .font: Theme.headingFont(level),
                .foregroundColor: NSColor.labelColor,
                .paragraphStyle: Theme.headingParagraphStyle(level),
                .mnBlockType: MNBlockType.heading.rawValue,
                .mnHeadingLevel: NSNumber(value: level),
            ]
            var ctx = InlineContext()
            ctx.headingLevel = level
            appendInlines(inlines, to: result, context: ctx, baseAttributes: attrs)
            attrs[.foregroundColor] = NSColor.labelColor
            result.append(NSAttributedString(string: "\n", attributes: attrs))

        case let .paragraph(inlines):
            let attrs = Theme.bodyAttributes()
            appendInlines(inlines, to: result, context: InlineContext(), baseAttributes: attrs)
            result.append(NSAttributedString(string: "\n", attributes: attrs))

        case let .codeBlock(language, text)
            where language.trimmingCharacters(in: .whitespaces).lowercased() == "mermaid":
            result.append(Self.mermaidAttachment(source: text))
            result.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))

        case let .codeBlock(language, text):
            let id = UUID().uuidString
            let attrs: [NSAttributedString.Key: Any] = [
                .font: Theme.code,
                .foregroundColor: NSColor.labelColor,
                .backgroundColor: Theme.codeBackground,
                .paragraphStyle: Theme.codeParagraphStyle(),
                .mnBlockType: MNBlockType.code.rawValue,
                .mnCodeBlockID: id,
                .mnCodeLanguage: language,
            ]
            var body = text
            if !body.hasSuffix("\n") { body += "\n" }
            if body == "\n" { body = "\n" }
            result.append(NSAttributedString(string: body, attributes: attrs))

        case let .quote(paragraphs):
            let id = UUID().uuidString
            let attrs: [NSAttributedString.Key: Any] = [
                .font: Theme.body,
                .foregroundColor: Theme.quoteColor,
                .paragraphStyle: Theme.quoteParagraphStyle(),
                .mnBlockType: MNBlockType.quote.rawValue,
                .mnQuoteID: id,
            ]
            for inlines in paragraphs {
                var ctx = InlineContext()
                ctx.color = Theme.quoteColor
                appendInlines(inlines, to: result, context: ctx, baseAttributes: attrs)
                result.append(NSAttributedString(string: "\n", attributes: attrs))
            }

        case let .listItem(depth, ordered, number, inlines):
            let style = Theme.listParagraphStyle(depth: depth, ordered: ordered)
            var attrs: [NSAttributedString.Key: Any] = [
                .font: Theme.body,
                .foregroundColor: NSColor.labelColor,
                .paragraphStyle: style,
                .mnBlockType: MNBlockType.paragraph.rawValue,
                .mnOrderedList: NSNumber(value: ordered),
            ]
            let marker = ordered ? "\(max(number, 1)).\t" : "\(Theme.bulletMarker(depth: depth))\t"
            result.append(NSAttributedString(string: marker, attributes: attrs))
            appendInlines(inlines, to: result, context: InlineContext(), baseAttributes: attrs)
            attrs[.foregroundColor] = NSColor.labelColor
            result.append(NSAttributedString(string: "\n", attributes: attrs))

        case let .table(rows):
            let cellStrings: [[NSAttributedString]] = rows.map { row in
                row.map { inlines in
                    let cell = NSMutableAttributedString()
                    appendInlines(inlines, to: cell, context: InlineContext(), baseAttributes: Theme.bodyAttributes())
                    return cell
                }
            }
            result.append(TableBuilder.attributedTable(cells: cellStrings))

        case .thematicBreak:
            let style = Theme.paragraphStyle(spacingBefore: 8, spacing: 8)
            let attrs: [NSAttributedString.Key: Any] = [
                .font: Theme.body,
                .foregroundColor: Theme.hrColor,
                .paragraphStyle: style,
                .mnBlockType: MNBlockType.hr.rawValue,
            ]
            result.append(NSAttributedString(string: String(repeating: "─", count: 40) + "\n", attributes: attrs))
        }
    }

    // MARK: - Inline

    func appendInlines(_ inlines: [MDInline],
                       to result: NSMutableAttributedString,
                       context: InlineContext,
                       baseAttributes: [NSAttributedString.Key: Any]) {
        for inline in inlines {
            switch inline {
            case let .text(s):
                result.append(NSAttributedString(string: s, attributes: textAttributes(context, base: baseAttributes)))

            case let .strong(children):
                var ctx = context; ctx.bold = true
                appendInlines(children, to: result, context: ctx, baseAttributes: baseAttributes)

            case let .emphasis(children):
                var ctx = context; ctx.italic = true
                appendInlines(children, to: result, context: ctx, baseAttributes: baseAttributes)

            case let .strikethrough(children):
                var ctx = context; ctx.strike = true
                appendInlines(children, to: result, context: ctx, baseAttributes: baseAttributes)

            case let .code(s):
                var attrs = textAttributes(context, base: baseAttributes)
                attrs[.font] = Theme.code
                attrs[.mnInlineCode] = NSNumber(value: true)
                attrs[.backgroundColor] = Theme.inlineCodeBackground
                attrs[.foregroundColor] = Theme.inlineCodeColor
                result.append(NSAttributedString(string: s, attributes: attrs))

            case let .link(text, url):
                let start = result.length
                appendInlines(text, to: result, context: context, baseAttributes: baseAttributes)
                let range = NSRange(location: start, length: result.length - start)
                if range.length > 0 {
                    result.addAttribute(.link, value: url, range: range)
                }

            case let .image(alt, path):
                result.append(Self.imageAttachment(path: path, alt: alt, baseURL: baseURL))
            }
        }
    }

    private func textAttributes(_ ctx: InlineContext,
                                base: [NSAttributedString.Key: Any]) -> [NSAttributedString.Key: Any] {
        var attrs = base
        attrs[.font] = Theme.font(bold: ctx.bold, italic: ctx.italic, code: false, headingLevel: ctx.headingLevel)
        attrs[.foregroundColor] = ctx.color
        if ctx.strike {
            attrs[.strikethroughStyle] = NSNumber(value: NSUnderlineStyle.single.rawValue)
        }
        return attrs
    }

    /// Attachment-Zeichen für ein Mermaid-Diagramm; der Quelltext bleibt als
    /// Attribut erhalten und wird als ```mermaid-Block serialisiert.
    /// Ohne `image` wird ein Platzhalter gezeigt (Rendering erfolgt asynchron).
    public static func mermaidAttachment(source: String, image: NSImage? = nil) -> NSAttributedString {
        let attachment = NSTextAttachment()
        if let image, image.size.width > 0, image.size.height > 0 {
            attachment.image = image
            var size = image.size
            if size.width > Theme.maxMermaidWidth {
                let scale = Theme.maxMermaidWidth / size.width
                size = NSSize(width: size.width * scale, height: size.height * scale)
            }
            attachment.bounds = NSRect(x: 0, y: 0, width: size.width, height: size.height)
        } else {
            attachment.image = mermaidPlaceholder(text: "Mermaid-Diagramm wird gerendert…")
            attachment.bounds = NSRect(x: 0, y: 0, width: 280, height: 44)
        }
        let s = NSMutableAttributedString(attachment: attachment)
        var attrs = Theme.bodyAttributes()
        attrs.removeValue(forKey: .font)
        attrs[.mnMermaidSource] = source
        s.addAttributes(attrs, range: NSRange(location: 0, length: s.length))
        return s
    }

    /// Platzhalterbild für Mermaid-Blöcke (lädt/Fehler).
    public static func mermaidPlaceholder(text: String, error: Bool = false) -> NSImage {
        let size = NSSize(width: 280, height: 44)
        return NSImage(size: size, flipped: false) { rect in
            let path = NSBezierPath(roundedRect: rect.insetBy(dx: 1, dy: 1), xRadius: 8, yRadius: 8)
            (error ? NSColor.systemRed.withAlphaComponent(0.08) : Theme.codeBackground).setFill()
            path.fill()
            (error ? NSColor.systemRed.withAlphaComponent(0.4) : NSColor.separatorColor).setStroke()
            path.stroke()
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 12),
                .foregroundColor: error ? NSColor.systemRed : NSColor.secondaryLabelColor,
            ]
            let s = NSAttributedString(string: text, attributes: attrs)
            let textSize = s.size()
            s.draw(at: NSPoint(x: max(6, (rect.width - textSize.width) / 2),
                               y: (rect.height - textSize.height) / 2))
            return true
        }
    }

    /// Erzeugt das Attachment-Zeichen für ein Bild inkl. Pfad-Attributen.
    public static func imageAttachment(path: String, alt: String, baseURL: URL?) -> NSAttributedString {
        let attachment = NSTextAttachment()
        var image: NSImage? = nil
        if !path.hasPrefix("http://") && !path.hasPrefix("https://") {
            let decoded = path.removingPercentEncoding ?? path
            if let base = baseURL {
                let fileURL = base.appendingPathComponent(decoded)
                image = NSImage(contentsOf: fileURL)
            } else if decoded.hasPrefix("/") {
                image = NSImage(contentsOfFile: decoded)
            }
        }
        if let img = image, img.size.width > 0, img.size.height > 0 {
            attachment.image = img
            var size = img.size
            if size.width > Theme.maxImageWidth {
                let scale = Theme.maxImageWidth / size.width
                size = NSSize(width: size.width * scale, height: size.height * scale)
            }
            if size.height > Theme.maxImageHeight {
                let scale = Theme.maxImageHeight / size.height
                size = NSSize(width: size.width * scale, height: size.height * scale)
            }
            attachment.bounds = NSRect(x: 0, y: 0, width: size.width, height: size.height)
        } else {
            let placeholder = NSImage(systemSymbolName: "photo", accessibilityDescription: alt.isEmpty ? "Bild" : alt)
            attachment.image = placeholder
            attachment.bounds = NSRect(x: 0, y: 0, width: 48, height: 36)
        }
        let s = NSMutableAttributedString(attachment: attachment)
        var attrs = Theme.bodyAttributes()
        attrs.removeValue(forKey: .font)
        attrs[.mnImagePath] = path
        attrs[.mnImageAlt] = alt
        s.addAttributes(attrs, range: NSRange(location: 0, length: s.length))
        return s
    }
}

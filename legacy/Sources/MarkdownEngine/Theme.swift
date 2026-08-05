import AppKit

/// Semantische Blocktypen, als Attribut auf Absatzebene gespeichert.
public enum MNBlockType: String {
    case paragraph
    case heading
    case code
    case quote
    case hr
}

public extension NSAttributedString.Key {
    /// Blocktyp des Absatzes (MNBlockType.rawValue).
    static let mnBlockType = NSAttributedString.Key("mn.blockType")
    /// Überschriften-Ebene 1...6 (NSNumber).
    static let mnHeadingLevel = NSAttributedString.Key("mn.headingLevel")
    /// Inline-Code-Span (NSNumber true).
    static let mnInlineCode = NSAttributedString.Key("mn.inlineCode")
    /// Identität eines Codeblocks (String/UUID) — trennt benachbarte Blöcke.
    static let mnCodeBlockID = NSAttributedString.Key("mn.codeBlockID")
    /// Sprache eines Codeblocks (String).
    static let mnCodeLanguage = NSAttributedString.Key("mn.codeLanguage")
    /// Identität eines Zitatblocks (String/UUID).
    static let mnQuoteID = NSAttributedString.Key("mn.quoteID")
    /// Relativer Pfad eines Bildes (String), auf dem Attachment-Zeichen.
    static let mnImagePath = NSAttributedString.Key("mn.imagePath")
    /// Alt-Text eines Bildes (String).
    static let mnImageAlt = NSAttributedString.Key("mn.imageAlt")
    /// Absatz gehört zu einer nummerierten Liste (NSNumber bool).
    static let mnOrderedList = NSAttributedString.Key("mn.orderedList")
    /// Mermaid-Quelltext eines gerenderten Diagramms (String), auf dem Attachment-Zeichen.
    static let mnMermaidSource = NSAttributedString.Key("mn.mermaidSource")
}

/// Zentrale Typografie/Farben des Editors.
public enum Theme {
    public static let bodySize: CGFloat = 15

    public static var body: NSFont { .systemFont(ofSize: bodySize) }
    public static var code: NSFont { .monospacedSystemFont(ofSize: 13.5, weight: .regular) }

    public static func headingFont(_ level: Int) -> NSFont {
        let sizes: [CGFloat] = [26, 21, 17.5, 16, 15, 15]
        let idx = min(max(level, 1), 6) - 1
        return .systemFont(ofSize: sizes[idx], weight: .bold)
    }

    public static var codeBackground: NSColor { NSColor.systemGray.withAlphaComponent(0.14) }
    public static var inlineCodeBackground: NSColor { NSColor.systemGray.withAlphaComponent(0.16) }
    public static var inlineCodeColor: NSColor { NSColor.systemPink }
    public static var quoteColor: NSColor { .secondaryLabelColor }
    public static var hrColor: NSColor { .separatorColor }
    public static var tableBorderColor: NSColor { .separatorColor }
    public static var tableHeaderBackground: NSColor { NSColor.systemGray.withAlphaComponent(0.12) }

    public static let listIndentStep: CGFloat = 22
    public static let maxImageWidth: CGFloat = 480
    public static let maxImageHeight: CGFloat = 420
    public static let maxMermaidWidth: CGFloat = 640

    public static func paragraphStyle(spacingBefore: CGFloat = 0, spacing: CGFloat = 7) -> NSMutableParagraphStyle {
        let p = NSMutableParagraphStyle()
        p.paragraphSpacing = spacing
        p.paragraphSpacingBefore = spacingBefore
        p.lineHeightMultiple = 1.12
        return p
    }

    public static func headingParagraphStyle(_ level: Int) -> NSMutableParagraphStyle {
        paragraphStyle(spacingBefore: level <= 2 ? 14 : 10, spacing: 7)
    }

    public static func codeParagraphStyle() -> NSMutableParagraphStyle {
        let p = paragraphStyle(spacing: 0)
        p.firstLineHeadIndent = 8
        p.headIndent = 8
        p.lineHeightMultiple = 1.2
        return p
    }

    public static func quoteParagraphStyle() -> NSMutableParagraphStyle {
        let p = paragraphStyle(spacing: 5)
        p.firstLineHeadIndent = 16
        p.headIndent = 16
        return p
    }

    public static func listParagraphStyle(depth: Int, ordered: Bool) -> NSMutableParagraphStyle {
        let p = paragraphStyle(spacing: 3)
        let d = max(1, depth)
        let indent = CGFloat(d - 1) * listIndentStep
        p.firstLineHeadIndent = indent
        p.headIndent = indent + listIndentStep
        p.tabStops = [NSTextTab(textAlignment: .left, location: indent + listIndentStep, options: [:])]
        p.defaultTabInterval = listIndentStep
        var lists: [NSTextList] = []
        for _ in 0..<d {
            let format: NSTextList.MarkerFormat = ordered ? NSTextList.MarkerFormat("{decimal}.") : .disc
            lists.append(NSTextList(markerFormat: format, options: 0))
        }
        p.textLists = lists
        return p
    }

    /// Aufzählungszeichen je Tiefe.
    public static func bulletMarker(depth: Int) -> String {
        switch depth {
        case 1: return "•"
        case 2: return "◦"
        default: return "▪"
        }
    }

    public static func font(bold: Bool, italic: Bool, code: Bool, headingLevel: Int? = nil) -> NSFont {
        var f: NSFont
        if code {
            f = Theme.code
        } else if let level = headingLevel {
            f = headingFont(level)
        } else {
            f = body
        }
        let fm = NSFontManager.shared
        if bold, !code, headingLevel == nil { f = fm.convert(f, toHaveTrait: .boldFontMask) }
        if italic { f = fm.convert(f, toHaveTrait: .italicFontMask) }
        return f
    }

    public static func bodyAttributes() -> [NSAttributedString.Key: Any] {
        [
            .font: body,
            .foregroundColor: NSColor.labelColor,
            .paragraphStyle: paragraphStyle(),
            .mnBlockType: MNBlockType.paragraph.rawValue,
        ]
    }
}

import AppKit
import MarkdownEngine

/// WYSIWYG-Textview: Notion-artiges Verhalten für Listen, Tabellen,
/// Überschriften, Bilder (Paste/Drop) und Auto-Formatierung.
final class MarkdownTextView: NSTextView {

    /// Die Markdown-Datei, zu der dieser Editor gehört (für Bild-Ressourcen).
    var assetTargetURL: URL?
    /// Wird gerufen, wenn der Editor den Fokus bekommt.
    var onFocus: (() -> Void)?
    /// Öffnet das Link-Sheet (von der App gesetzt).
    var onRequestLinkSheet: (() -> Void)?
    /// Zurück/Vorwärts im Navigationsmodus (von der App gesetzt; die App
    /// ignoriert die Aufrufe, wenn der Navigationsmodus inaktiv ist).
    var onNavigateBack: (() -> Void)?
    var onNavigateForward: (() -> Void)?

    /// Drei-Finger-Wischen (je nach Systemeinstellung „Zwischen Seiten blättern“).
    override func swipe(with event: NSEvent) {
        if event.deltaX > 0 {
            onNavigateBack?()
        } else if event.deltaX < 0 {
            onNavigateForward?()
        } else {
            super.swipe(with: event)
        }
    }

    /// Maus-Zusatztasten 4/5 (Zurück/Vorwärts wie im Browser).
    override func otherMouseUp(with event: NSEvent) {
        switch event.buttonNumber {
        case 3: onNavigateBack?()
        case 4: onNavigateForward?()
        default: super.otherMouseUp(with: event)
        }
    }
    /// Verhindert Collapse-Reentranz beim Umschalten Mermaid-Diagramm ⇄ Code.
    var isTogglingMermaid = false
    /// Mermaid-Attachments, für die bereits ein Rendering angestoßen wurde.
    var renderedMermaidAttachments = Set<ObjectIdentifier>()
    /// Hover-Lupe zum Öffnen der Mermaid-Zoom-Vorschau.
    var mermaidLensButton: NSButton?
    /// Zeichenindex des Diagramms, über dem die Lupe gerade schwebt.
    var mermaidLensIndex: Int = -1
    /// Lokaler Event-Monitor, der Mouse-Moved-Events für die Hover-Lupe liefert.
    var mermaidLensMonitor: Any?

    // MARK: - Grundlagen

    var nsString: NSString { string as NSString }

    func blockType(at index: Int) -> MNBlockType {
        guard let ts = textStorage, ts.length > 0 else { return .paragraph }
        let i = min(max(index, 0), ts.length - 1)
        let raw = ts.attribute(.mnBlockType, at: i, effectiveRange: nil) as? String
        return MNBlockType(rawValue: raw ?? "") ?? .paragraph
    }

    func paragraphStyle(at index: Int) -> NSParagraphStyle? {
        guard let ts = textStorage, ts.length > 0 else { return nil }
        let i = min(max(index, 0), ts.length - 1)
        return ts.attribute(.paragraphStyle, at: i, effectiveRange: nil) as? NSParagraphStyle
    }

    func tableBlock(at index: Int) -> NSTextTableBlock? {
        paragraphStyle(at: index)?.textBlocks.first as? NSTextTableBlock
    }

    /// Ersetzt einen Bereich mit Undo-Unterstützung.
    func replaceWithUndo(_ range: NSRange, with attributed: NSAttributedString) {
        guard let ts = textStorage else { return }
        guard shouldChangeText(in: range, replacementString: attributed.string) else { return }
        ts.replaceCharacters(in: range, with: attributed)
        didChangeText()
    }

    /// Attribut-Änderungen mit Undo-Unterstützung.
    func changeAttributes(in range: NSRange, _ body: (NSTextStorage) -> Void) {
        guard let ts = textStorage, range.length > 0 else { return }
        guard shouldChangeText(in: range, replacementString: nil) else { return }
        ts.beginEditing()
        body(ts)
        ts.endEditing()
        didChangeText()
    }

    func paragraphRanges(in range: NSRange) -> [NSRange] {
        var result: [NSRange] = []
        let full = nsString.paragraphRange(for: range)
        var loc = full.location
        while loc < NSMaxRange(full) {
            let pr = nsString.paragraphRange(for: NSRange(location: loc, length: 0))
            if pr.length == 0 { break }
            result.append(pr)
            loc = NSMaxRange(pr)
        }
        return result
    }

    // MARK: - Listen-Infos

    struct ListInfo {
        var depth: Int
        var ordered: Bool
        var markerRange: NSRange // Länge 0, wenn kein Marker gefunden
    }

    func listInfo(at pr: NSRange) -> ListInfo? {
        guard pr.length > 0, let ts = textStorage else { return nil }
        let attrs = ts.attributes(at: pr.location, effectiveRange: nil)
        guard let ps = attrs[.paragraphStyle] as? NSParagraphStyle, !ps.textLists.isEmpty else { return nil }
        let ordered = (attrs[.mnOrderedList] as? NSNumber)?.boolValue
            ?? (ps.textLists.last?.markerFormat.rawValue.contains("decimal") ?? false)
        let text = nsString.substring(with: pr)
        let markerLen = Self.markerPrefixLength(of: text)
        return ListInfo(depth: ps.textLists.count, ordered: ordered,
                        markerRange: NSRange(location: pr.location, length: markerLen))
    }

    /// Länge eines Listen-Markers ("•\t", "◦\t", "▪\t", "12.\t") am Textanfang, in UTF-16-Einheiten.
    static func markerPrefixLength(of text: String) -> Int {
        for bullet in ["•", "◦", "▪"] {
            if text.hasPrefix(bullet + "\t") {
                return (bullet as NSString).length + 1
            }
        }
        var count = 0
        var idx = text.startIndex
        while idx < text.endIndex, text[idx].isNumber, count < 10 {
            count += 1
            idx = text.index(after: idx)
        }
        if count > 0, idx < text.endIndex, text[idx] == "." {
            let after = text.index(after: idx)
            if after < text.endIndex, text[after] == "\t" {
                return count + 2
            }
        }
        return 0
    }

    /// Inhaltsbereich eines Absatzes (ohne Marker, ohne abschließenden Zeilenumbruch).
    func contentRange(of pr: NSRange) -> NSRange {
        var start = pr.location
        var length = pr.length
        if length > 0, nsString.substring(with: NSRange(location: NSMaxRange(pr) - 1, length: 1)) == "\n" {
            length -= 1
        }
        if let li = listInfo(at: pr) {
            start += li.markerRange.length
            length -= li.markerRange.length
        }
        return NSRange(location: start, length: max(0, length))
    }

    // MARK: - Fokus

    override func becomeFirstResponder() -> Bool {
        onFocus?()
        return super.becomeFirstResponder()
    }

    // MARK: - Maus (Mermaid-Diagramme anklicken)

    override func mouseDown(with event: NSEvent) {
        if event.clickCount == 1,
           let hit = mermaidHit(at: convert(event.locationInWindow, from: nil)) {
            if event.modifierFlags.contains(.command) {
                zoomMermaidBlock(at: hit.index)
            } else {
                expandMermaidBlock(at: hit.index)
            }
            return
        }
        super.mouseDown(with: event)
    }

    // Mouse-Moved-Events kommen im SwiftUI-Fenster nicht über die
    // Tracking-Area an; stattdessen liefert ein lokaler Event-Monitor
    // die Hover-Position (siehe MarkdownTextView+MermaidZoom).
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            window?.acceptsMouseMovedEvents = true
            installMermaidLensMonitor()
        } else {
            removeMermaidLensMonitor()
            hideMermaidLens()
        }
    }

    deinit {
        removeMermaidLensMonitor()
    }

    // MARK: - Enter-Taste

    override func insertNewline(_ sender: Any?) {
        let sel = selectedRange()
        guard let ts = textStorage else { super.insertNewline(sender); return }
        let pr = nsString.paragraphRange(for: sel)

        // ``` + Enter → Codeblock
        if pr.length > 0, tableBlock(at: pr.location) == nil, blockType(at: pr.location) != .code {
            let paraText = nsString.substring(with: pr).trimmingCharacters(in: .whitespacesAndNewlines)
            if paraText.hasPrefix("```") {
                let lang = String(paraText.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                let attrs = Self.codeBlockAttributes(language: lang)
                replaceWithUndo(pr, with: NSAttributedString(string: "\n", attributes: attrs))
                setSelectedRange(NSRange(location: pr.location, length: 0))
                typingAttributes = attrs
                return
            }
        }

        // Innerhalb einer Tabelle: normaler Zeilenumbruch in der Zelle
        if pr.length > 0, tableBlock(at: pr.location) != nil {
            super.insertNewline(sender)
            return
        }

        // Listenpunkt
        if pr.length > 0, let li = listInfo(at: pr) {
            let content = contentRange(of: pr)
            if content.length == 0 {
                // Leeren Punkt → Liste verlassen
                convertParagraphToBody(pr)
                return
            }
            super.insertNewline(sender)
            let marker = li.ordered ? "1.\t" : "\(Theme.bulletMarker(depth: li.depth))\t"
            var attrs = Theme.bodyAttributes()
            attrs[.paragraphStyle] = Theme.listParagraphStyle(depth: li.depth, ordered: li.ordered)
            attrs[.mnOrderedList] = NSNumber(value: li.ordered)
            let caret = selectedRange().location
            replaceWithUndo(NSRange(location: caret, length: 0),
                            with: NSAttributedString(string: marker, attributes: attrs))
            setSelectedRange(NSRange(location: caret + (marker as NSString).length, length: 0))
            typingAttributes = attrs
            if li.ordered { renumberOrderedLists() }
            return
        }

        let type = pr.length > 0 ? blockType(at: pr.location) : .paragraph

        // Überschrift: neuer Absatz wird normaler Text
        if type == .heading, sel.location >= NSMaxRange(pr) - 1 {
            super.insertNewline(sender)
            let newPr = nsString.paragraphRange(for: selectedRange())
            if newPr.length > 0 { convertParagraphToBody(newPr, keepCaret: true) }
            typingAttributes = Theme.bodyAttributes()
            return
        }

        // Leerer Zitat-Absatz → Zitat verlassen
        if type == .quote, pr.length > 0, contentRange(of: pr).length == 0 {
            convertParagraphToBody(pr)
            return
        }

        // Leere letzte Zeile eines Codeblocks → Block verlassen
        if type == .code, pr.length > 0, contentRange(of: pr).length == 0 {
            let next = NSMaxRange(pr)
            let sameBlockFollows: Bool
            if next < ts.length {
                let myID = ts.attribute(.mnCodeBlockID, at: pr.location, effectiveRange: nil) as? String
                let nextID = ts.attribute(.mnCodeBlockID, at: next, effectiveRange: nil) as? String
                sameBlockFollows = myID != nil && myID == nextID
            } else {
                sameBlockFollows = false
            }
            if !sameBlockFollows {
                convertParagraphToBody(pr)
                return
            }
        }

        super.insertNewline(sender)
    }

    /// Wandelt einen Absatz in normalen Fließtext um (entfernt Marker & Blockattribute).
    func convertParagraphToBody(_ pr: NSRange, keepCaret: Bool = false) {
        guard let ts = textStorage, pr.length > 0 else {
            typingAttributes = Theme.bodyAttributes()
            return
        }
        let m = NSMutableAttributedString(attributedString: ts.attributedSubstring(from: pr))
        Self.stripLeadingListMarker(m)
        let full = NSRange(location: 0, length: m.length)
        for key: NSAttributedString.Key in [.mnCodeBlockID, .mnCodeLanguage, .mnQuoteID,
                                            .mnHeadingLevel, .mnOrderedList, .backgroundColor,
                                            .mnInlineCode] {
            m.removeAttribute(key, range: full)
        }
        let body = Theme.bodyAttributes()
        m.addAttribute(.paragraphStyle, value: body[.paragraphStyle]!, range: full)
        m.addAttribute(.mnBlockType, value: MNBlockType.paragraph.rawValue, range: full)
        m.addAttribute(.foregroundColor, value: NSColor.labelColor, range: full)
        m.enumerateAttribute(.attachment, in: full) { value, range, _ in
            if value == nil {
                m.addAttribute(.font, value: Theme.body, range: range)
            }
        }
        let caret = selectedRange().location
        replaceWithUndo(pr, with: m)
        if keepCaret {
            setSelectedRange(NSRange(location: min(caret, pr.location + m.length), length: 0))
        } else {
            setSelectedRange(NSRange(location: pr.location + max(0, m.length - 1), length: 0))
        }
        typingAttributes = Theme.bodyAttributes()
    }

    static func stripLeadingListMarker(_ m: NSMutableAttributedString) {
        let len = markerPrefixLength(of: m.string)
        if len > 0 {
            m.deleteCharacters(in: NSRange(location: 0, length: len))
        }
    }

    static func codeBlockAttributes(language: String) -> [NSAttributedString.Key: Any] {
        [
            .font: Theme.code,
            .foregroundColor: NSColor.labelColor,
            .backgroundColor: Theme.codeBackground,
            .paragraphStyle: Theme.codeParagraphStyle(),
            .mnBlockType: MNBlockType.code.rawValue,
            .mnCodeBlockID: UUID().uuidString,
            .mnCodeLanguage: language,
        ]
    }

    // MARK: - Tab / Backtab

    override func insertTab(_ sender: Any?) {
        let sel = selectedRange()
        if tableBlock(at: sel.location) != nil {
            moveToAdjacentCell(forward: true)
            return
        }
        let pr = nsString.paragraphRange(for: sel)
        if pr.length > 0, listInfo(at: pr) != nil {
            changeListIndent(by: 1)
            return
        }
        super.insertTab(sender)
    }

    override func insertBacktab(_ sender: Any?) {
        let sel = selectedRange()
        if tableBlock(at: sel.location) != nil {
            moveToAdjacentCell(forward: false)
            return
        }
        let pr = nsString.paragraphRange(for: sel)
        if pr.length > 0, listInfo(at: pr) != nil {
            changeListIndent(by: -1)
            return
        }
        super.insertBacktab(sender)
    }

    // MARK: - Auto-Formatierung ("# ", "- ", "1. ", "> ")

    override func insertText(_ string: Any, replacementRange: NSRange) {
        super.insertText(string, replacementRange: replacementRange)
        if let s = string as? String, s == " " {
            applyAutoformatIfNeeded()
        }
    }

    private func applyAutoformatIfNeeded() {
        let sel = selectedRange()
        guard sel.length == 0 else { return }
        let pr = nsString.paragraphRange(for: sel)
        guard pr.length > 0,
              tableBlock(at: pr.location) == nil,
              blockType(at: pr.location) == .paragraph,
              (paragraphStyle(at: pr.location)?.textLists.isEmpty ?? true)
        else { return }

        let prefixRange = NSRange(location: pr.location, length: sel.location - pr.location)
        guard prefixRange.length > 0, prefixRange.length <= 7 else { return }
        let prefix = nsString.substring(with: prefixRange)

        func consume(_ action: () -> Void) {
            replaceWithUndo(prefixRange, with: NSAttributedString(string: "", attributes: Theme.bodyAttributes()))
            setSelectedRange(NSRange(location: pr.location, length: 0))
            action()
        }

        if prefix.hasSuffix(" "), prefix.dropLast().allSatisfy({ $0 == "#" }) {
            let level = prefix.count - 1
            if (1...6).contains(level) {
                consume { self.setHeadingLevel(level) }
                return
            }
        }
        switch prefix {
        case "- ", "* ", "+ ":
            consume { self.setList(ordered: false, on: true) }
        case "1. ", "1) ":
            consume { self.setList(ordered: true, on: true) }
        case "> ":
            consume { self.toggleQuote(forceOn: true) }
        default:
            break
        }
    }

    // MARK: - Bilder: Einfügen / Paste / Drop

    func insertImages(from urls: [URL]) {
        guard let target = assetTargetURL else { return }
        for url in urls {
            guard let rel = try? AssetManager.importImageFile(url, for: target) else { continue }
            insertImageAttachment(relativePath: rel)
        }
    }

    func insertImageAttachment(relativePath: String) {
        let base = assetTargetURL?.deletingLastPathComponent()
        let attachment = AttributedBuilder.imageAttachment(path: relativePath, alt: "", baseURL: base)
        let sel = selectedRange()
        replaceWithUndo(sel, with: attachment)
        setSelectedRange(NSRange(location: sel.location + attachment.length, length: 0))
    }

    override func paste(_ sender: Any?) {
        let pb = NSPasteboard.general
        if let urls = pb.readObjects(forClasses: [NSURL.self],
                                     options: [.urlReadingFileURLsOnly: true]) as? [URL],
           !urls.isEmpty, urls.allSatisfy({ AssetManager.isImageFile($0) }) {
            insertImages(from: urls)
            return
        }
        if pb.string(forType: .string) == nil, pasteImageDataIfAvailable(pb) {
            return
        }
        pasteAsPlainText(sender)
    }

    @discardableResult
    private func pasteImageDataIfAvailable(_ pb: NSPasteboard) -> Bool {
        guard let target = assetTargetURL else { return false }
        var data: Data?
        var ext = "png"
        if let png = pb.data(forType: .png) {
            data = png
        } else if let tiff = pb.data(forType: .tiff),
                  let rep = NSBitmapImageRep(data: tiff),
                  let png = rep.representation(using: .png, properties: [:]) {
            data = png
        } else if let pdf = pb.data(forType: .pdf) {
            data = pdf
            ext = "pdf"
        }
        guard let imageData = data else { return false }
        guard let rel = try? AssetManager.saveImageData(imageData, fileExtension: ext, for: target) else { return false }
        insertImageAttachment(relativePath: rel)
        return true
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        let pb = sender.draggingPasteboard
        if let urls = pb.readObjects(forClasses: [NSURL.self],
                                     options: [.urlReadingFileURLsOnly: true]) as? [URL],
           !urls.isEmpty, urls.allSatisfy({ AssetManager.isImageFile($0) }) {
            let point = convert(sender.draggingLocation, from: nil)
            let index = characterIndexForInsertion(at: point)
            setSelectedRange(NSRange(location: index, length: 0))
            insertImages(from: urls)
            return true
        }
        return super.performDragOperation(sender)
    }

    // MARK: - Kontextmenü

    override func menu(for event: NSEvent) -> NSMenu? {
        let menu = super.menu(for: event) ?? NSMenu()
        let sel = selectedRange()
        if tableBlock(at: sel.location) != nil {
            menu.insertItem(NSMenuItem.separator(), at: 0)
            let tableMenu = NSMenu(title: "Tabelle")
            tableMenu.addItem(withTitle: "Zeile darunter einfügen", action: #selector(tableInsertRowBelow(_:)), keyEquivalent: "")
            tableMenu.addItem(withTitle: "Zeile darüber einfügen", action: #selector(tableInsertRowAbove(_:)), keyEquivalent: "")
            tableMenu.addItem(withTitle: "Spalte rechts einfügen", action: #selector(tableInsertColumnRight(_:)), keyEquivalent: "")
            tableMenu.addItem(withTitle: "Spalte links einfügen", action: #selector(tableInsertColumnLeft(_:)), keyEquivalent: "")
            tableMenu.addItem(NSMenuItem.separator())
            tableMenu.addItem(withTitle: "Zeile löschen", action: #selector(tableDeleteRow(_:)), keyEquivalent: "")
            tableMenu.addItem(withTitle: "Spalte löschen", action: #selector(tableDeleteColumn(_:)), keyEquivalent: "")
            tableMenu.addItem(NSMenuItem.separator())
            tableMenu.addItem(withTitle: "Tabelle löschen", action: #selector(tableDeleteWhole(_:)), keyEquivalent: "")
            let item = NSMenuItem(title: "Tabelle", action: nil, keyEquivalent: "")
            item.submenu = tableMenu
            menu.insertItem(item, at: 0)
        }
        if let ts = textStorage, ts.length > 0 {
            let i = min(sel.location, ts.length - 1)
            if ts.attribute(.link, at: i, effectiveRange: nil) != nil {
                menu.insertItem(NSMenuItem.separator(), at: 0)
                menu.insertItem(withTitle: "Link bearbeiten…", action: #selector(editLinkFromMenu(_:)), keyEquivalent: "", at: 0)
            }
        }
        if let hit = mermaidHit(at: convert(event.locationInWindow, from: nil)),
           let source = mermaidSource(at: hit.index) {
            menu.insertItem(NSMenuItem.separator(), at: 0)
            let item = NSMenuItem(title: "Diagramm vergrößern…",
                                  action: #selector(zoomMermaidFromMenu(_:)), keyEquivalent: "")
            item.representedObject = source
            menu.insertItem(item, at: 0)
        }
        return menu
    }

    @objc private func editLinkFromMenu(_ sender: Any?) {
        onRequestLinkSheet?()
    }
}

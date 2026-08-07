import AppKit
import MarkdownEngine

/// Mermaid-Diagramme: Klick auf ein gerendertes Diagramm öffnet den
/// Quelltext als ```mermaid-Codeblock; verlässt der Cursor den Block,
/// wird wieder das Diagramm angezeigt.
extension MarkdownTextView {

    /// Mermaid-Quelltext, wenn an `index` ein Diagramm-Attachment steht.
    func mermaidSource(at index: Int) -> String? {
        guard let ts = textStorage, index >= 0, index < ts.length else { return nil }
        guard ts.attribute(.attachment, at: index, effectiveRange: nil) != nil else { return nil }
        return ts.attribute(.mnMermaidSource, at: index, effectiveRange: nil) as? String
    }

    /// Diagramm → editierbarer Codeblock, Cursor an den Blockanfang.
    func expandMermaidBlock(at index: Int) {
        guard let source = mermaidSource(at: index) else { return }
        hideMermaidLens()
        let pr = nsString.paragraphRange(for: NSRange(location: index, length: 0))
        var text = source
        if !text.hasSuffix("\n") { text += "\n" }
        let attrs = Self.codeBlockAttributes(language: "mermaid")
        isTogglingMermaid = true
        replaceWithUndo(pr, with: NSAttributedString(string: text, attributes: attrs))
        isTogglingMermaid = false
        setSelectedRange(NSRange(location: pr.location, length: 0))
        typingAttributes = attrs
        window?.makeFirstResponder(self)
    }

    /// Alle Mermaid-Codeblöcke, in denen die Auswahl nicht (mehr) steht,
    /// wieder als Diagramm darstellen. Leere Blöcke bleiben Code.
    func collapseInactiveMermaidBlocks() {
        guard !isTogglingMermaid, let ts = textStorage, ts.length > 0 else { return }
        let sel = selectedRange()

        var candidates: [NSRange] = []
        ts.enumerateAttribute(.mnCodeBlockID, in: NSRange(location: 0, length: ts.length)) { value, range, _ in
            guard value is String, range.length > 0 else { return }
            let lang = ts.attribute(.mnCodeLanguage, at: range.location, effectiveRange: nil) as? String
            guard lang?.trimmingCharacters(in: .whitespaces).lowercased() == "mermaid" else { return }
            candidates.append(range)
        }

        // Rückwärts, damit vordere Ranges bei Ersetzungen gültig bleiben.
        for range in candidates.reversed() {
            let inside: Bool
            if sel.length == 0 {
                inside = sel.location >= range.location && sel.location < NSMaxRange(range)
            } else {
                inside = NSIntersectionRange(sel, range).length > 0
            }
            if inside { continue }

            var source = nsString.substring(with: range)
            if source.hasSuffix("\n") { source.removeLast() }
            if source.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { continue }

            let replacement = NSMutableAttributedString(
                attributedString: AttributedBuilder.mermaidAttachment(source: source))
            replacement.append(NSAttributedString(string: "\n", attributes: Theme.bodyAttributes()))
            isTogglingMermaid = true
            replaceWithUndo(range, with: replacement)
            isTogglingMermaid = false
        }
        renderMermaidAttachments()
    }

    /// Stößt das (asynchrone) Rendern aller noch nicht gerenderten
    /// Diagramm-Attachments an.
    func renderMermaidAttachments() {
        guard let ts = textStorage else { return }
        var jobs: [(attachment: NSTextAttachment, source: String)] = []
        ts.enumerateAttribute(.mnMermaidSource, in: NSRange(location: 0, length: ts.length)) { value, range, _ in
            guard let source = value as? String, range.length > 0,
                  let attachment = ts.attribute(.attachment, at: range.location, effectiveRange: nil) as? NSTextAttachment
            else { return }
            let key = ObjectIdentifier(attachment)
            guard !renderedMermaidAttachments.contains(key) else { return }
            renderedMermaidAttachments.insert(key)
            jobs.append((attachment, source))
        }
        for job in jobs {
            MermaidRenderer.shared.render(job.source) { [weak self] image in
                guard let self else { return }
                let final = image ?? AttributedBuilder.mermaidPlaceholder(
                    text: "Mermaid-Diagramm konnte nicht gerendert werden", error: true)
                job.attachment.image = final
                var size = final.size
                if size.width > Theme.maxMermaidWidth {
                    let scale = Theme.maxMermaidWidth / size.width
                    size = NSSize(width: size.width * scale, height: size.height * scale)
                }
                job.attachment.bounds = NSRect(x: 0, y: 0, width: size.width, height: size.height)
                self.refreshAttachment(job.attachment)
            }
        }
    }

    /// Layout/Darstellung eines Attachments nach Bildänderung auffrischen.
    private func refreshAttachment(_ attachment: NSTextAttachment) {
        guard let ts = textStorage else { return }
        var found: NSRange?
        ts.enumerateAttribute(.attachment, in: NSRange(location: 0, length: ts.length)) { value, range, stop in
            if (value as? NSTextAttachment) === attachment {
                found = range
                stop.pointee = true
            }
        }
        guard let range = found else { return }
        ts.beginEditing()
        ts.addAttribute(.attachment, value: attachment, range: range)
        ts.endEditing()
        layoutManager?.invalidateLayout(forCharacterRange: range, actualCharacterRange: nil)
        needsDisplay = true
    }
}

import AppKit
import SwiftUI
import MarkdownEngine

/// Besitzt NSScrollView + MarkdownTextView für einen Tab und
/// verbindet den Editor mit dem Dokument (Autosave, Link-Klicks).
final class EditorController: NSObject, NSTextViewDelegate {

    let document: MarkdownDocument
    let scrollView: NSScrollView
    let textView: MarkdownTextView

    /// Klick auf einen Link (String-Wert aus dem .link-Attribut).
    var onOpenLink: ((String) -> Void)?

    init(document: MarkdownDocument) {
        self.document = document

        // TextKit-1-Stack (NSTextTable benötigt TextKit 1)
        let layoutManager = NSLayoutManager()
        document.textStorage.addLayoutManager(layoutManager)
        let container = NSTextContainer(size: NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        layoutManager.addTextContainer(container)

        let textView = MarkdownTextView(frame: .zero, textContainer: container)
        textView.isRichText = true
        textView.allowsUndo = true
        textView.isEditable = true
        textView.isSelectable = true
        textView.importsGraphics = false
        textView.allowsImageEditing = false
        textView.usesFontPanel = false
        textView.usesFindBar = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude,
                                  height: CGFloat.greatestFiniteMagnitude)
        textView.textContainerInset = NSSize(width: 28, height: 24)
        textView.backgroundColor = .textBackgroundColor
        textView.typingAttributes = Theme.bodyAttributes()
        textView.assetTargetURL = document.fileURL
        self.textView = textView

        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = true
        scrollView.backgroundColor = .textBackgroundColor
        scrollView.documentView = textView
        self.scrollView = scrollView

        super.init()
        textView.delegate = self
        textView.renderMermaidAttachments()
    }

    func updateFileURL(_ url: URL) {
        document.updateURL(url)
        textView.assetTargetURL = url
    }

    /// Lädt eine andere Datei in denselben Editor (Navigationsmodus).
    func navigate(to url: URL) {
        document.save()
        document.updateURL(url)
        document.load()
        textView.assetTargetURL = url
        textView.setSelectedRange(NSRange(location: 0, length: 0))
        textView.undoManager?.removeAllActions()
        textView.renderMermaidAttachments()
        textView.scroll(.zero)
    }

    /// Schaltet den Editor zwischen editierbar und read-only um.
    func setReadOnly(_ readOnly: Bool) {
        if readOnly { document.save() }
        textView.isEditable = !readOnly
    }

    // MARK: - NSTextViewDelegate

    func textDidChange(_ notification: Notification) {
        document.noteEdited()
    }

    func textViewDidChangeSelection(_ notification: Notification) {
        textView.collapseInactiveMermaidBlocks()
    }

    func textView(_ textView: NSTextView, clickedOnLink link: Any, at charIndex: Int) -> Bool {
        let value = (link as? URL)?.absoluteString ?? "\(link)"
        onOpenLink?(value)
        return true
    }
}

/// SwiftUI-Wrapper: liefert die pro Tab gecachte Editor-Ansicht.
struct EditorRepresentable: NSViewRepresentable {
    let controller: EditorController

    func makeNSView(context: Context) -> NSScrollView {
        controller.scrollView
    }

    func updateNSView(_ nsView: NSScrollView, context: Context) {}
}

import SwiftUI
import AppKit
import MarkdownEngine

/// Hilfe-Fenster: rendert die gebündelte Hilfe (Help.de.md / Help.en.md)
/// mit der App-eigenen Markdown-Engine, read-only, mit Sprachumschalter.
struct HelpView: View {
    @AppStorage("helpLanguage") private var language = Locale.preferredLanguages
        .first?.hasPrefix("de") == true ? "de" : "en"

    private var markdown: String {
        guard let url = Bundle.module.url(forResource: "Help.\(language)", withExtension: "md"),
              let text = try? String(contentsOf: url, encoding: .utf8)
        else { return language == "de" ? "Hilfe nicht gefunden." : "Help not found." }
        return text
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Picker("", selection: $language) {
                    Text("Deutsch").tag("de")
                    Text("English").tag("en")
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            Divider()
            HelpMarkdownView(markdown: markdown)
        }
        .navigationTitle(language == "de" ? "MyNotion-Hilfe" : "MyNotion Help")
        .frame(minWidth: 480, minHeight: 400)
    }
}

/// Read-only-Darstellung eines Markdown-Textes mit der MarkdownEngine
/// (TextKit-1-Stack wie im Editor, da Tabellen NSTextTable benötigen).
struct HelpMarkdownView: NSViewRepresentable {
    let markdown: String

    func makeNSView(context: Context) -> NSScrollView {
        let textStorage = NSTextStorage()
        let layoutManager = NSLayoutManager()
        textStorage.addLayoutManager(layoutManager)
        let container = NSTextContainer(size: NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        layoutManager.addTextContainer(container)

        let textView = NSTextView(frame: .zero, textContainer: container)
        textView.isEditable = false
        textView.isSelectable = true
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainerInset = NSSize(width: 28, height: 24)
        textView.backgroundColor = .textBackgroundColor

        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = true
        scrollView.backgroundColor = .textBackgroundColor
        scrollView.documentView = textView
        return scrollView
    }

    func updateNSView(_ nsView: NSScrollView, context: Context) {
        guard let textView = nsView.documentView as? NSTextView,
              let textStorage = textView.textStorage else { return }
        let blocks = MarkdownParser.parse(markdown)
        let attributed = AttributedBuilder(baseURL: nil).build(blocks)
        if !textStorage.isEqual(to: attributed) {
            textStorage.setAttributedString(attributed)
            textView.scroll(.zero)
        }
    }
}

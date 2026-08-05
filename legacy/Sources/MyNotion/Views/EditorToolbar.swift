import SwiftUI
import AppKit

/// Formatierungs-Toolbar über dem Editor einer Sektion.
struct EditorToolbar: View {
    @ObservedObject var app: AppState
    @ObservedObject var tab: EditorTab

    // Die Toolbar wird nur für Markdown-Tabs angezeigt (siehe PaneView).
    private var textView: MarkdownTextView { tab.controller!.textView }

    var body: some View {
        HStack(spacing: 2) {
            toolbarButton("chevron.left", "Zurück (⌘[)") { app.goBack(tab) }
                .disabled(!tab.isNavigationMode || tab.backStack.isEmpty)
            toolbarButton("chevron.right", "Vorwärts (⌘])") { app.goForward(tab) }
                .disabled(!tab.isNavigationMode || tab.forwardStack.isEmpty)

            divider

            formatControls
                .disabled(tab.isNavigationMode)

            Spacer()

            Button {
                app.activePaneID = paneID()
                pane_selectTab()
                app.toggleNavigationMode()
            } label: {
                Image(systemName: tab.isNavigationMode ? "book.fill" : "book")
                    .frame(width: 22, height: 20)
                    .foregroundStyle(tab.isNavigationMode ? Color.accentColor : Color.primary)
            }
            .buttonStyle(.borderless)
            .help(tab.isNavigationMode
                  ? "Navigationsmodus verlassen (⌘R)"
                  : "Navigationsmodus: read-only, Links öffnen im selben Tab (⌘R)")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    /// Stellt sicher, dass der Toggle den *eigenen* Tab trifft, auch wenn
    /// gerade eine andere Sektion aktiv ist.
    private func paneID() -> UUID {
        app.panes.first { p in p.tabs.contains { $0.id == tab.id } }?.id ?? app.activePaneID
    }

    private func pane_selectTab() {
        app.panes.first { $0.id == paneID() }?.selectedTabID = tab.id
    }

    @ViewBuilder
    private var formatControls: some View {
        HStack(spacing: 2) {
            Menu {
                Button("Text") { textView.setHeadingLevel(0) }
                Button("Überschrift 1") { textView.setHeadingLevel(1) }
                Button("Überschrift 2") { textView.setHeadingLevel(2) }
                Button("Überschrift 3") { textView.setHeadingLevel(3) }
            } label: {
                Image(systemName: "textformat.size")
            }
            .menuStyle(.borderlessButton)
            .frame(width: 44)
            .help("Absatzformat")

            divider

            toolbarButton("bold", "Fett (⌘B)") { textView.toggleBold() }
            toolbarButton("italic", "Kursiv (⌘I)") { textView.toggleItalic() }
            toolbarButton("strikethrough", "Durchgestrichen") { textView.toggleStrikethrough() }
            toolbarButton("chevron.left.forwardslash.chevron.right", "Inline-Code (⌘E)") {
                textView.toggleInlineCode()
            }

            divider

            toolbarButton("list.bullet", "Aufzählung") { textView.setList(ordered: false) }
            toolbarButton("list.number", "Nummerierte Liste") { textView.setList(ordered: true) }
            toolbarButton("text.quote", "Zitat") { textView.toggleQuote() }
            toolbarButton("curlybraces", "Codeblock") { textView.toggleCodeBlock() }

            divider

            toolbarButton("link", "Link einfügen (⌘K)") { app.showLinkSheet(for: tab) }
            toolbarButton("photo", "Bild einfügen") { insertImage() }

            Menu {
                Button("Tabelle einfügen (3×3)") { textView.insertTable(rows: 3, cols: 3) }
                Button("Tabelle einfügen (2×2)") { textView.insertTable(rows: 2, cols: 2) }
                Divider()
                Button("Zeile darunter einfügen") { textView.tableInsertRowBelow(nil) }
                Button("Zeile darüber einfügen") { textView.tableInsertRowAbove(nil) }
                Button("Spalte rechts einfügen") { textView.tableInsertColumnRight(nil) }
                Button("Spalte links einfügen") { textView.tableInsertColumnLeft(nil) }
                Divider()
                Button("Zeile löschen") { textView.tableDeleteRow(nil) }
                Button("Spalte löschen") { textView.tableDeleteColumn(nil) }
                Button("Tabelle löschen") { textView.tableDeleteWhole(nil) }
            } label: {
                Image(systemName: "tablecells")
            }
            .menuStyle(.borderlessButton)
            .frame(width: 44)
            .help("Tabelle")

            toolbarButton("minus", "Trennlinie") { textView.insertHorizontalRule() }
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.secondary.opacity(0.25))
            .frame(width: 1, height: 16)
            .padding(.horizontal, 4)
    }

    private func toolbarButton(_ symbol: String, _ help: String,
                               action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .frame(width: 22, height: 20)
        }
        .buttonStyle(.borderless)
        .help(help)
    }

    private func insertImage() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = true
        panel.allowedContentTypes = [.image]
        panel.prompt = "Einfügen"
        if panel.runModal() == .OK {
            textView.insertImages(from: panel.urls)
        }
    }
}

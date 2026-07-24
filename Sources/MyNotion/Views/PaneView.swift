import SwiftUI
import AppKit

/// Eine Sektion: Tab-Leiste + Toolbar + Editor.
struct PaneView: View {
    @ObservedObject var app: AppState
    @ObservedObject var pane: Pane

    var body: some View {
        VStack(spacing: 0) {
            tabBar
            Divider()
            if let tab = pane.selectedTab {
                EditorToolbar(app: app, tab: tab)
                Divider()
                EditorRepresentable(controller: tab.controller)
                    .id(tab.id)
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 36))
                        .foregroundStyle(.tertiary)
                    Text("Keine Notiz geöffnet")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(nsColor: .textBackgroundColor))
            }
        }
        .background(
            app.activePaneID == pane.id && app.isSplit
                ? Color.accentColor.opacity(0.06)
                : Color.clear
        )
        .dropDestination(for: String.self) { items, _ in
            var moved = false
            for idString in items {
                app.moveTab(idString: idString, to: pane)
                moved = true
            }
            return moved
        }
        .onTapGesture {
            app.activePaneID = pane.id
        }
    }

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 1) {
                ForEach(pane.tabs) { tab in
                    TabItemView(
                        app: app,
                        pane: pane,
                        tab: tab,
                        isSelected: pane.selectedTabID == tab.id
                    )
                }
            }
            .padding(.horizontal, 4)
        }
        .frame(height: 30)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

/// Ein einzelner Tab in der Tab-Leiste.
struct TabItemView: View {
    @ObservedObject var app: AppState
    @ObservedObject var pane: Pane
    @ObservedObject var tab: EditorTab
    @ObservedObject var document: MarkdownDocument
    let isSelected: Bool

    @State private var isHovering = false

    init(app: AppState, pane: Pane, tab: EditorTab, isSelected: Bool) {
        self.app = app
        self.pane = pane
        self.tab = tab
        self.document = tab.document
        self.isSelected = isSelected
    }

    var body: some View {
        HStack(spacing: 5) {
            Text(tab.title)
                .lineLimit(1)
                .font(.system(size: 12))
            if document.isDirty {
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 6, height: 6)
            }
            Button {
                app.close(tab)
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 8, weight: .bold))
            }
            .buttonStyle(.borderless)
            .opacity(isHovering || isSelected ? 1 : 0)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 5)
                .fill(isSelected ? Color(nsColor: .controlBackgroundColor) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 5)
                .strokeBorder(isSelected ? Color.secondary.opacity(0.35) : Color.clear)
        )
        .contentShape(Rectangle())
        .onHover { isHovering = $0 }
        .onTapGesture {
            pane.selectedTabID = tab.id
            app.activePaneID = pane.id
            app.focusActiveEditor()
        }
        .draggable(tab.id.uuidString)
        .contextMenu {
            Button("Schließen") { app.close(tab) }
            Button("Andere schließen") { app.closeOtherTabs(keeping: tab) }
            Divider()
            Button("In andere Sektion verschieben") {
                pane.selectedTabID = tab.id
                app.activePaneID = pane.id
                app.moveActiveTabToOtherPane()
            }
            Divider()
            Button("Im Finder zeigen") {
                NSWorkspace.shared.activateFileViewerSelecting([tab.url])
            }
        }
        .help(tab.url.path)
    }
}

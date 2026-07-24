import SwiftUI
import AppKit
import UniformTypeIdentifiers

/// Hierarchischer Vault-Baum in der Sidebar.
struct FileTreeView: View {
    @ObservedObject var app: AppState
    @ObservedObject var vault: VaultStore

    init(app: AppState) {
        self.app = app
        self.vault = app.vault
    }

    var body: some View {
        VStack(spacing: 0) {
            if let root = vault.root {
                List {
                    OutlineGroup(root.children ?? [], id: \.id, children: \.children) { node in
                        FileRowView(app: app, node: node)
                    }
                }
                .listStyle(.sidebar)
                .contextMenu {
                    Button("Neue Notiz") { app.newNote() }
                    Button("Neuer Ordner") { app.newFolder() }
                }
            } else {
                VStack(spacing: 12) {
                    Text("Kein Vault geöffnet")
                        .foregroundStyle(.secondary)
                    Button("Vault öffnen…") { app.chooseVault() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            Divider()
            HStack(spacing: 10) {
                Button { app.newNote() } label: {
                    Image(systemName: "square.and.pencil")
                }
                .help("Neue Notiz")
                Button { app.newFolder() } label: {
                    Image(systemName: "folder.badge.plus")
                }
                .help("Neuer Ordner")
                Spacer()
                Button { vault.rescan() } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .help("Neu einlesen")
                Button { vault.showResources.toggle() } label: {
                    Image(systemName: vault.showResources ? "eye.fill" : "eye.slash")
                }
                .help(vault.showResources ? "Ressourcen ausblenden" : "Ressourcen einblenden")
            }
            .buttonStyle(.borderless)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
        }
    }
}

/// Eine Zeile im Dateibaum inkl. Kontextmenü und Drag&Drop.
struct FileRowView: View {
    @ObservedObject var app: AppState
    let node: FileNode

    @State private var isDropTarget = false

    private var isActive: Bool {
        app.activeTab?.url == node.url
    }

    private var icon: String {
        if node.isDirectory {
            return AssetManager.isAssetsDirectory(node.url) ? "photo.on.rectangle" : "folder"
        }
        return node.isMarkdown ? "doc.text" : "doc"
    }

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .foregroundStyle(node.isDirectory ? Color.accentColor : Color.secondary)
            Text(node.displayName)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .contentShape(Rectangle())
        .fontWeight(isActive ? .semibold : .regular)
        .padding(.vertical, 1)
        .background(isDropTarget ? Color.accentColor.opacity(0.2) : Color.clear)
        .onTapGesture {
            if !node.isDirectory {
                app.open(node.url)
            }
        }
        .draggable(node.url.path)
        .dropDestination(for: String.self) { items, _ in
            guard node.isDirectory else { return false }
            var moved = false
            for path in items {
                let source = URL(fileURLWithPath: path)
                if source != node.url {
                    app.move(source, into: node.url)
                    moved = true
                }
            }
            return moved
        } isTargeted: { targeted in
            isDropTarget = targeted && node.isDirectory
        }
        .contextMenu {
            if node.isDirectory {
                Button("Neue Notiz") { app.newNote(in: node.url) }
                Button("Neuer Ordner") { app.newFolder(in: node.url) }
                Divider()
            } else if node.isMarkdown {
                Button("Öffnen") { app.open(node.url) }
                Divider()
            }
            Button("Umbenennen…") {
                app.renameSheet = RenameSheetState(
                    url: node.url,
                    name: node.isDirectory ? node.name : node.url.deletingPathExtension().lastPathComponent
                )
            }
            Button("In den Papierkorb legen", role: .destructive) {
                app.trash(node.url)
            }
            Divider()
            Button("Im Finder zeigen") {
                NSWorkspace.shared.activateFileViewerSelecting([node.url])
            }
        }
    }
}

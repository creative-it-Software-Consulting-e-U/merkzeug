import SwiftUI
import AppKit

/// Übersicht über den Inhalt eines Vault-Ordners; wird als eigener Tab angezeigt.
struct FolderOverviewView: View {
    @ObservedObject var app: AppState
    @ObservedObject var vault: VaultStore
    @ObservedObject var tab: EditorTab

    init(app: AppState, tab: EditorTab) {
        self.app = app
        self.vault = app.vault
        self.tab = tab
    }

    private var node: FileNode? { vault.node(for: tab.url) }

    private var relativePath: String {
        guard let vaultURL = vault.vaultURL else { return tab.url.path }
        let vaultName = vaultURL.lastPathComponent
        let rest = String(tab.url.path.dropFirst(vaultURL.path.count))
        return vaultName + rest
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider()
            if let children = node?.children, !children.isEmpty {
                List {
                    ForEach(children) { child in
                        FolderOverviewRow(app: app, tab: tab, child: child)
                    }
                }
                .listStyle(.inset)
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "folder")
                        .font(.system(size: 36))
                        .foregroundStyle(.tertiary)
                    Text(node == nil ? "Ordner nicht gefunden" : "Ordner ist leer")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Color(nsColor: .textBackgroundColor))
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Image(systemName: "folder.fill")
                    .foregroundStyle(Color.accentColor)
                Text(tab.title)
                    .font(.title2.bold())
                Spacer()
                if let count = node?.children?.count {
                    Text("\(count) \(count == 1 ? "Eintrag" : "Einträge")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Text(relativePath)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

/// Eine Zeile in der Ordner-Übersicht.
struct FolderOverviewRow: View {
    @ObservedObject var app: AppState
    @ObservedObject var tab: EditorTab
    let child: FileNode

    private var icon: String {
        if child.isDirectory {
            return AssetManager.isAssetsDirectory(child.url) ? "photo.on.rectangle" : "folder"
        }
        return child.isMarkdown ? "doc.text" : "doc"
    }

    private var detail: String? {
        if child.isDirectory {
            let count = child.children?.count ?? 0
            return "\(count) \(count == 1 ? "Eintrag" : "Einträge")"
        }
        guard let date = (try? child.url.resourceValues(forKeys: [.contentModificationDateKey]))?
            .contentModificationDate else { return nil }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(child.isDirectory ? Color.accentColor : Color.secondary)
                .frame(width: 18)
            Text(child.displayName)
                .lineLimit(1)
            Spacer(minLength: 12)
            if let detail {
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .contentShape(Rectangle())
        .padding(.vertical, 2)
        .onTapGesture {
            app.openFolderEntry(child.url, from: tab)
        }
        .contextMenu {
            Button("Öffnen") { app.openFolderEntry(child.url, from: tab) }
            if tab.isNavigationMode {
                Button("In neuem Tab öffnen") { app.open(child.url) }
            }
            Divider()
            Button("Im Finder zeigen") {
                NSWorkspace.shared.activateFileViewerSelecting([child.url])
            }
        }
    }
}

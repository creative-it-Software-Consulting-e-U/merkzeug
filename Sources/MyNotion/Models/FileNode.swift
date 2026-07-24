import Foundation

/// Ein Knoten im Vault-Baum.
struct FileNode: Identifiable, Hashable {
    let url: URL
    let isDirectory: Bool
    var children: [FileNode]?

    var id: URL { url }
    var name: String { url.lastPathComponent }
    var displayName: String {
        isDirectory ? name : url.deletingPathExtension().lastPathComponent
    }
    var isMarkdown: Bool {
        !isDirectory && url.pathExtension.lowercased() == "md"
    }
}

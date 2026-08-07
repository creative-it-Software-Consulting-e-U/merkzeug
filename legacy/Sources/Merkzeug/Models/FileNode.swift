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

extension URL {
    /// Kanonische Form des Pfads (löst Symlinks wie `/var` ↔ `/private/var` in
    /// eine einheitliche Form auf), damit Pfadvergleiche im Vault zuverlässig sind.
    var mnCanonical: URL {
        URL(fileURLWithPath: (standardizedFileURL.path as NSString).resolvingSymlinksInPath)
    }
}

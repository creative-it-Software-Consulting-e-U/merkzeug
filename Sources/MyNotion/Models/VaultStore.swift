import Foundation
import AppKit

/// Verwaltet den Vault: Verzeichnisbaum, Dateioperationen, Ressourcen-Ordner.
final class VaultStore: ObservableObject {

    @Published private(set) var root: FileNode?
    @Published var showResources = false {
        didSet { rescan() }
    }

    private(set) var vaultURL: URL?
    private var watcher: FSEventsWatcher?
    private var rescanScheduled = false

    /// Wird nach Umbenennen/Verschieben aufgerufen: (alteURL, neueURL)
    var onFileMoved: ((URL, URL) -> Void)?
    /// Wird nach dem Löschen aufgerufen.
    var onFileDeleted: ((URL) -> Void)?

    // MARK: - Vault öffnen / scannen

    func open(_ url: URL) {
        vaultURL = url
        UserDefaults.standard.set(url.path, forKey: "vaultPath")
        watcher?.stop()
        watcher = FSEventsWatcher(path: url.path) { [weak self] in
            self?.scheduleRescan()
        }
        rescan()
    }

    private func scheduleRescan() {
        guard !rescanScheduled else { return }
        rescanScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.rescanScheduled = false
            self?.rescan()
        }
    }

    func rescan() {
        guard let vaultURL else { root = nil; return }
        root = scan(vaultURL)
    }

    private func scan(_ url: URL) -> FileNode {
        let fm = FileManager.default
        let contents = (try? fm.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        )) ?? []

        var children: [FileNode] = []
        for item in contents {
            let isDir = (try? item.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
            if isDir {
                if AssetManager.isAssetsDirectory(item), !showResources { continue }
                children.append(scan(item))
            } else {
                let isMD = item.pathExtension.lowercased() == "md"
                if !isMD, !showResources { continue }
                children.append(FileNode(url: item, isDirectory: false, children: nil))
            }
        }
        children.sort { a, b in
            if a.isDirectory != b.isDirectory { return a.isDirectory }
            return a.name.localizedStandardCompare(b.name) == .orderedAscending
        }
        return FileNode(url: url, isDirectory: true, children: children)
    }

    // MARK: - Dateioperationen

    @discardableResult
    func createNote(in directory: URL) throws -> URL {
        let fm = FileManager.default
        var name = "Unbenannt"
        var target = directory.appendingPathComponent("\(name).md")
        var counter = 2
        while fm.fileExists(atPath: target.path) {
            name = "Unbenannt \(counter)"
            target = directory.appendingPathComponent("\(name).md")
            counter += 1
        }
        try "".write(to: target, atomically: true, encoding: .utf8)
        rescan()
        return target
    }

    @discardableResult
    func createFolder(in directory: URL) throws -> URL {
        let fm = FileManager.default
        var target = directory.appendingPathComponent("Neuer Ordner")
        var counter = 2
        while fm.fileExists(atPath: target.path) {
            target = directory.appendingPathComponent("Neuer Ordner \(counter)")
            counter += 1
        }
        try fm.createDirectory(at: target, withIntermediateDirectories: false)
        rescan()
        return target
    }

    /// Benennt Datei/Ordner um; bei Markdown-Dateien wird der Ressourcen-Ordner
    /// mit umbenannt und die Bildpfade in der Datei werden angepasst.
    @discardableResult
    func rename(_ url: URL, to newName: String) throws -> URL {
        let fm = FileManager.default
        let dir = url.deletingLastPathComponent()
        let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
        let isMD = !isDir && url.pathExtension.lowercased() == "md"

        var finalName = newName.trimmingCharacters(in: .whitespaces)
        guard !finalName.isEmpty else { return url }
        if isMD, !finalName.lowercased().hasSuffix(".md") {
            finalName += ".md"
        }
        let newURL = dir.appendingPathComponent(finalName)
        guard newURL != url else { return url }
        guard !fm.fileExists(atPath: newURL.path) else {
            throw NSError(domain: "MyNotion", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Es existiert bereits ein Eintrag mit diesem Namen.",
            ])
        }

        try fm.moveItem(at: url, to: newURL)

        if isMD {
            let oldAssets = AssetManager.assetsDirectory(for: url)
            let newAssets = AssetManager.assetsDirectory(for: newURL)
            if fm.fileExists(atPath: oldAssets.path) {
                try? fm.moveItem(at: oldAssets, to: newAssets)
                rewriteAssetReferences(in: newURL,
                                       oldFolder: oldAssets.lastPathComponent,
                                       newFolder: newAssets.lastPathComponent)
            }
        }
        rescan()
        onFileMoved?(url, newURL)
        return newURL
    }

    /// Verschiebt Datei/Ordner in ein Zielverzeichnis (inkl. Ressourcen-Ordner).
    @discardableResult
    func move(_ url: URL, into destination: URL) throws -> URL {
        let fm = FileManager.default
        guard destination != url.deletingLastPathComponent() else { return url }
        // Nicht in sich selbst verschieben
        if destination.path == url.path || destination.path.hasPrefix(url.path + "/") {
            return url
        }
        let target = destination.appendingPathComponent(url.lastPathComponent)
        guard !fm.fileExists(atPath: target.path) else {
            throw NSError(domain: "MyNotion", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Am Zielort existiert bereits ein Eintrag mit diesem Namen.",
            ])
        }
        try fm.moveItem(at: url, to: target)

        let isDir = (try? target.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
        if !isDir, url.pathExtension.lowercased() == "md" {
            let oldAssets = AssetManager.assetsDirectory(for: url)
            if fm.fileExists(atPath: oldAssets.path) {
                let newAssets = AssetManager.assetsDirectory(for: target)
                try? fm.moveItem(at: oldAssets, to: newAssets)
            }
        }
        rescan()
        onFileMoved?(url, target)
        return target
    }

    /// Legt Datei/Ordner in den Papierkorb; bei Markdown inkl. Ressourcen-Ordner.
    func trash(_ url: URL) throws {
        let fm = FileManager.default
        let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
        if !isDir, url.pathExtension.lowercased() == "md" {
            let assets = AssetManager.assetsDirectory(for: url)
            if fm.fileExists(atPath: assets.path) {
                try? fm.trashItem(at: assets, resultingItemURL: nil)
            }
        }
        try fm.trashItem(at: url, resultingItemURL: nil)
        rescan()
        onFileDeleted?(url)
    }

    /// Ersetzt Verweise auf den alten Ressourcen-Ordner im Markdown-Text.
    private func rewriteAssetReferences(in mdURL: URL, oldFolder: String, newFolder: String) {
        guard var text = try? String(contentsOf: mdURL, encoding: .utf8) else { return }
        var changed = false
        let oldEncoded = oldFolder.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? oldFolder
        let newEncoded = newFolder.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? newFolder
        for (old, new) in [(oldFolder + "/", newFolder + "/"), (oldEncoded + "/", newEncoded + "/")] {
            if text.contains(old) {
                text = text.replacingOccurrences(of: old, with: new)
                changed = true
            }
        }
        if changed {
            try? text.write(to: mdURL, atomically: true, encoding: .utf8)
        }
    }
}

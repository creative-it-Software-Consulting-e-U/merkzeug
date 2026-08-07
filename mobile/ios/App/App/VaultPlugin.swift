import Foundation
import UIKit
import UniformTypeIdentifiers
import Capacitor

/// Zugriff auf den Vault-Ordner: Dokument-Picker, security-scoped Bookmark
/// und koordinierte Datei-Zugriffe (Pflicht bei File-Provider-Ordnern wie
/// denen von Working Copy).
@objc(VaultPlugin)
public class VaultPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "VaultPlugin"
    public let jsName = "Vault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "restoreVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readTree", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readFileBase64", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stat", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "rename", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "search", returnType: CAPPluginReturnPromise)
    ]

    private static let bookmarkKey = "MerkzeugVaultBookmark"
    private var vaultURL: URL?
    private var pendingPick: CAPPluginCall?

    // MARK: - Vault wählen / wiederherstellen

    @objc func restoreVault(_ call: CAPPluginCall) {
        guard let data = UserDefaults.standard.data(forKey: Self.bookmarkKey) else {
            call.resolve([:])
            return
        }
        var stale = false
        guard let url = try? URL(resolvingBookmarkData: data, bookmarkDataIsStale: &stale),
              url.startAccessingSecurityScopedResource() else {
            UserDefaults.standard.removeObject(forKey: Self.bookmarkKey)
            call.resolve([:])
            return
        }
        if stale, let fresh = try? url.bookmarkData() {
            UserDefaults.standard.set(fresh, forKey: Self.bookmarkKey)
        }
        vaultURL = url
        call.resolve(["name": url.lastPathComponent])
    }

    @objc func pickVault(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.pendingPick = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
            picker.allowsMultipleSelection = false
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        guard let call = pendingPick else { return }
        pendingPick = nil
        guard let url = urls.first, url.startAccessingSecurityScopedResource() else {
            call.reject("Zugriff auf den Ordner wurde verweigert.")
            return
        }
        if let old = vaultURL, old != url {
            old.stopAccessingSecurityScopedResource()
        }
        if let bookmark = try? url.bookmarkData() {
            UserDefaults.standard.set(bookmark, forKey: Self.bookmarkKey)
        }
        vaultURL = url
        call.resolve(["name": url.lastPathComponent])
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingPick?.resolve([:])
        pendingPick = nil
    }

    // MARK: - Pfad-Helfer

    /// Vault-relative Pfade ("/Ordner/Notiz.md") in Datei-URLs übersetzen;
    /// Pfade außerhalb des Vaults werden abgewiesen.
    private func fileURL(for path: String, call: CAPPluginCall) -> URL? {
        guard let vault = vaultURL else {
            call.reject("Kein Vault geöffnet.")
            return nil
        }
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let url = vault.appendingPathComponent(trimmed).standardizedFileURL
        guard url.path == vault.standardizedFileURL.path
            || url.path.hasPrefix(vault.standardizedFileURL.path + "/") else {
            call.reject("Pfad liegt außerhalb des Vaults.")
            return nil
        }
        return url
    }

    // MARK: - Baum

    @objc func readTree(_ call: CAPPluginCall) {
        guard let vault = vaultURL else {
            call.reject("Kein Vault geöffnet.")
            return
        }
        let tree = Self.scanDirectory(vault, relPath: "/", name: vault.lastPathComponent)
        call.resolve(["tree": tree])
    }

    private static func scanDirectory(_ url: URL, relPath: String, name: String) -> [String: Any] {
        var children: [[String: Any]] = []
        let entries = (try? FileManager.default.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        )) ?? []
        let sorted = entries.sorted {
            $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending
        }
        for entry in sorted {
            let childName = entry.lastPathComponent
            let childRel = relPath == "/" ? "/\(childName)" : "\(relPath)/\(childName)"
            let isDir = (try? entry.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
            if isDir {
                children.append(scanDirectory(entry, relPath: childRel, name: childName))
            } else {
                children.append([
                    "name": childName,
                    "path": childRel,
                    "isDirectory": false
                ])
            }
        }
        return [
            "name": name,
            "path": relPath,
            "isDirectory": true,
            "children": children
        ]
    }

    // MARK: - Datei-IO (koordiniert)

    private func coordinatedRead(_ url: URL) throws -> Data {
        var coordinatorError: NSError?
        var result: Result<Data, Error> = .failure(
            NSError(domain: "Merkzeug", code: 1, userInfo: [NSLocalizedDescriptionKey: "Lesen fehlgeschlagen"])
        )
        NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinatorError) { actual in
            do {
                result = .success(try Data(contentsOf: actual))
            } catch {
                result = .failure(error)
            }
        }
        if let coordinatorError { throw coordinatorError }
        return try result.get()
    }

    private func coordinatedWrite(_ data: Data, to url: URL) throws {
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        var coordinatorError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &coordinatorError) { actual in
            do {
                try data.write(to: actual, options: .atomic)
            } catch {
                writeError = error
            }
        }
        if let coordinatorError { throw coordinatorError }
        if let writeError { throw writeError }
    }

    /// Änderungszeitpunkt in Millisekunden seit Epoche (wie Date.now() im JS).
    private static func mtimeMs(_ url: URL) -> Double? {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
              let date = attrs[.modificationDate] as? Date else { return nil }
        return date.timeIntervalSince1970 * 1000
    }

    @objc func readFile(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        do {
            let data = try coordinatedRead(url)
            guard let content = String(data: data, encoding: .utf8) else {
                call.reject("Datei ist kein UTF-8-Text.")
                return
            }
            call.resolve(["content": content, "mtime": Self.mtimeMs(url) ?? 0])
        } catch {
            call.reject("Lesen fehlgeschlagen: \(error.localizedDescription)")
        }
    }

    @objc func writeFile(_ call: CAPPluginCall) {
        guard let path = call.getString("path"),
              let content = call.getString("content"),
              let url = fileURL(for: path, call: call) else {
            call.reject("Parameter 'path'/'content' fehlen.")
            return
        }
        // Stale-Check: Wurde die Datei seit dem Laden extern geändert (z. B.
        // durch einen Pull in Working Copy), nicht blind überschreiben.
        if let expected = call.getDouble("expectedMtime"),
           let onDisk = Self.mtimeMs(url),
           onDisk > expected + 1 {
            call.reject("Die Datei wurde außerhalb von Merkzeug geändert.", "CONFLICT")
            return
        }
        do {
            try coordinatedWrite(Data(content.utf8), to: url)
            call.resolve(["mtime": Self.mtimeMs(url) ?? 0])
        } catch {
            call.reject("Speichern fehlgeschlagen: \(error.localizedDescription)")
        }
    }

    @objc func readFileBase64(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        do {
            let data = try coordinatedRead(url)
            call.resolve(["data": data.base64EncodedString()])
        } catch {
            call.reject("Lesen fehlgeschlagen: \(error.localizedDescription)")
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let notePath = call.getString("notePath"),
              let base64 = call.getString("base64"),
              let ext = call.getString("ext"),
              let data = Data(base64Encoded: base64) else {
            call.reject("Parameter 'notePath'/'base64'/'ext' fehlen oder sind ungültig.")
            return
        }
        let noteDir = (notePath as NSString).deletingLastPathComponent
        let safeExt = ext.lowercased().filter { $0.isLetter || $0.isNumber }
        let fileName = "bild-\(UUID().uuidString.prefix(8).lowercased()).\(safeExt)"
        let relDir = noteDir == "/" ? "/assets" : "\(noteDir)/assets"
        guard let url = fileURL(for: "\(relDir)/\(fileName)", call: call) else { return }
        do {
            try coordinatedWrite(data, to: url)
            call.resolve(["relPath": "assets/\(fileName)"])
        } catch {
            call.reject("Bild konnte nicht gespeichert werden: \(error.localizedDescription)")
        }
    }

    @objc func exists(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        call.resolve(["exists": FileManager.default.fileExists(atPath: url.path)])
    }

    @objc func stat(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        var isDir: ObjCBool = false
        let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
        var result: [String: Any] = ["exists": exists, "isDirectory": isDir.boolValue]
        if exists, let mtime = Self.mtimeMs(url) {
            result["mtime"] = mtime
        }
        call.resolve(result)
    }

    // MARK: - Anlegen / Umbenennen / Löschen

    @objc func createFolder(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        var coordinatorError: NSError?
        var opError: Error?
        NSFileCoordinator().coordinate(writingItemAt: url, options: [], error: &coordinatorError) { actual in
            do {
                try FileManager.default.createDirectory(at: actual, withIntermediateDirectories: true)
            } catch {
                opError = error
            }
        }
        if let err = coordinatorError ?? (opError as NSError?) {
            call.reject("Ordner konnte nicht angelegt werden: \(err.localizedDescription)")
            return
        }
        call.resolve()
    }

    @objc func deleteItem(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject("Parameter 'path' fehlt.") }
            return
        }
        guard url.standardizedFileURL.path != vaultURL?.standardizedFileURL.path else {
            call.reject("Der Vault-Ordner selbst kann nicht gelöscht werden.")
            return
        }
        var coordinatorError: NSError?
        var opError: Error?
        NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordinatorError) { actual in
            do {
                try FileManager.default.removeItem(at: actual)
            } catch {
                opError = error
            }
        }
        if let err = coordinatorError ?? (opError as NSError?) {
            call.reject("Löschen fehlgeschlagen: \(err.localizedDescription)")
            return
        }
        call.resolve()
    }

    @objc func rename(_ call: CAPPluginCall) {
        guard let from = call.getString("from"),
              let to = call.getString("to"),
              let fromURL = fileURL(for: from, call: call),
              let toURL = fileURL(for: to, call: call) else {
            if call.getString("from") == nil || call.getString("to") == nil {
                call.reject("Parameter 'from'/'to' fehlen.")
            }
            return
        }
        guard !FileManager.default.fileExists(atPath: toURL.path) else {
            call.reject("Es gibt bereits eine Datei oder einen Ordner mit diesem Namen.")
            return
        }
        var coordinatorError: NSError?
        var opError: Error?
        NSFileCoordinator().coordinate(
            writingItemAt: fromURL, options: .forMoving,
            writingItemAt: toURL, options: [],
            error: &coordinatorError
        ) { src, dst in
            do {
                try FileManager.default.createDirectory(
                    at: dst.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try FileManager.default.moveItem(at: src, to: dst)
            } catch {
                opError = error
            }
        }
        if let err = coordinatorError ?? (opError as NSError?) {
            call.reject("Umbenennen fehlgeschlagen: \(err.localizedDescription)")
            return
        }
        call.resolve()
    }

    // MARK: - Suche

    /// Sucht case-insensitiv in Dateinamen und Inhalten aller Markdown-Dateien.
    /// Läuft im Hintergrund, damit die UI nicht blockiert.
    @objc func search(_ call: CAPPluginCall) {
        guard let vault = vaultURL else {
            call.reject("Kein Vault geöffnet.")
            return
        }
        guard let query = call.getString("query"), !query.isEmpty else {
            call.resolve(["results": []])
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let limit = 100
            var results: [[String: Any]] = []
            let vaultPath = vault.standardizedFileURL.path
            let enumerator = FileManager.default.enumerator(
                at: vault,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
            )
            while let entry = enumerator?.nextObject() as? URL {
                if results.count >= limit { break }
                let isDir = (try? entry.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
                guard !isDir, entry.pathExtension.lowercased() == "md" else { continue }
                let relPath = String(entry.standardizedFileURL.path.dropFirst(vaultPath.count))
                let nameMatch = entry.lastPathComponent.localizedCaseInsensitiveContains(query)
                var snippet = ""
                if let data = try? Data(contentsOf: entry),
                   let content = String(data: data, encoding: .utf8) {
                    for line in content.split(separator: "\n", omittingEmptySubsequences: true) {
                        if line.localizedCaseInsensitiveContains(query) {
                            snippet = String(line.trimmingCharacters(in: .whitespaces).prefix(160))
                            break
                        }
                    }
                }
                if nameMatch || !snippet.isEmpty {
                    results.append(["path": relPath, "snippet": snippet])
                }
            }
            call.resolve(["results": results])
        }
    }
}

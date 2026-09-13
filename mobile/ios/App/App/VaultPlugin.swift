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
        CAPPluginMethod(name: "printDocument", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickVault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "guidanceRead", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "guidanceAppend", returnType: CAPPluginReturnPromise),
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

    private var printingDocument = false

    @objc func printDocument(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.printingDocument else { call.reject("A print dialog is already open"); return }
            guard UIPrintInteractionController.isPrintingAvailable,
                  let webView = self.bridge?.webView,
                  let presenter = self.bridge?.viewController else {
                call.reject("Printing is not available"); return
            }
            self.printingDocument = true
            // Paginate the prepared shared print view first, then hand the resulting
            // PDF to AirPrint. Menus and controls are excluded by print CSS.
            let renderer = MerkzeugPrintRenderer(landscape: call.getBool("landscape") ?? false)
            renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
            guard renderer.numberOfPages > 0 else {
                self.printingDocument = false; call.reject("No printable pages"); return
            }
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, renderer.paperRect, nil)
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
            for page in 0..<renderer.numberOfPages {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: page, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()
            guard data.length > 0, UIPrintInteractionController.canPrint(data as Data) else {
                self.printingDocument = false; call.reject("Could not prepare printable PDF"); return
            }
            let controller = UIPrintInteractionController.shared
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = call.getString("title") ?? "Merkzeug"
            info.outputType = .general
            controller.printInfo = info
            controller.printingItem = data as Data
            let completion: UIPrintInteractionController.CompletionHandler = { _, _, error in
                self.printingDocument = false
                if let error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
            let shown: Bool
            if UIDevice.current.userInterfaceIdiom == .pad {
                shown = controller.present(from: CGRect(x: presenter.view.bounds.midX, y: 40, width: 1, height: 1), in: presenter.view, animated: true, completionHandler: completion)
            } else {
                shown = controller.present(animated: true, completionHandler: completion)
            }
            if !shown { self.printingDocument = false; call.reject("Could not open print dialog") }
        }
    }

    // MARK: - Vault wählen / wiederherstellen

    @objc func restoreVault(_ call: CAPPluginCall) {
        #if DEBUG && targetEnvironment(simulator)
        // Reproducible screenshot fixture, absent from device and Release builds.
        if ProcessInfo.processInfo.environment["MERKZEUG_DEMO_MODE"] == "1",
           let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            let demo = documents.appendingPathComponent("Demo Vault", isDirectory: true)
            if let json = ProcessInfo.processInfo.environment["MERKZEUG_DEMO_FILES"],
               let data = json.data(using: .utf8),
               let files = try? JSONDecoder().decode([String: String].self, from: data) {
                do {
                    if FileManager.default.fileExists(atPath: demo.path) { try FileManager.default.removeItem(at: demo) }
                    for (path, contents) in files {
                        guard !path.hasPrefix("/"), !path.split(separator: "/").contains(".."), path.hasSuffix(".md") else { throw CocoaError(.fileReadInvalidFileName) }
                        let target = demo.appendingPathComponent(path)
                        try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try contents.write(to: target, atomically: true, encoding: .utf8)
                    }
                } catch { call.reject("Could not prepare screenshot fixtures"); return }
            }
            if FileManager.default.fileExists(atPath: demo.path) {
                vaultURL = demo
                var result: [String: Any] = ["name": "Demo Vault", "id": "demo-vault"]
                if let note = ProcessInfo.processInfo.environment["MERKZEUG_DEMO_NOTE"],
                   ["/Welcome.md", "/Projects/Garden.md", "/Willkommen.md", "/Projekte/Garten.md"].contains(note) {
                    result["initialPath"] = note
                }
                call.resolve(result)
                return
            }
        }
        #endif
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
        call.resolve(["name": url.lastPathComponent, "id": url.absoluteString])
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
            call.reject(localized("Access to the folder was denied.", "Zugriff auf den Ordner wurde verweigert."))
            return
        }
        if let old = vaultURL, old != url {
            old.stopAccessingSecurityScopedResource()
        }
        if let bookmark = try? url.bookmarkData() {
            UserDefaults.standard.set(bookmark, forKey: Self.bookmarkKey)
        }
        vaultURL = url
        call.resolve(["name": url.lastPathComponent, "id": url.absoluteString])
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
            call.reject(localized("No vault is open.", "Kein Vault geöffnet."))
            return nil
        }
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let url = vault.appendingPathComponent(trimmed).standardizedFileURL
        guard url.path == vault.standardizedFileURL.path
            || url.path.hasPrefix(vault.standardizedFileURL.path + "/") else {
            call.reject(localized("Path is outside the vault.", "Pfad liegt außerhalb des Vaults."))
            return nil
        }
        return url
    }

    // MARK: - Baum

    @objc func readTree(_ call: CAPPluginCall) {
        guard let vault = vaultURL else {
            call.reject(localized("No vault is open.", "Kein Vault geöffnet."))
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
            NSError(domain: "Merkzeug", code: 1, userInfo: [NSLocalizedDescriptionKey: localized("Read failed", "Lesen fehlgeschlagen")])
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
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
            return
        }
        do {
            let data = try coordinatedRead(url)
            guard let content = String(data: data, encoding: .utf8) else {
                call.reject(localized("File is not UTF-8 text.", "Datei ist kein UTF-8-Text."))
                return
            }
            call.resolve(["content": content, "mtime": Self.mtimeMs(url) ?? 0])
        } catch {
            call.reject(localized("Read failed: \(error.localizedDescription)", "Lesen fehlgeschlagen: \(error.localizedDescription)"))
        }
    }

    @objc func guidanceRead(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), ["AGENTS.md", "CLAUDE.md"].contains(name),
              let root = vaultURL else { call.reject("Invalid instruction file"); return }
        let url = root.appendingPathComponent(name)
        guard url.resolvingSymlinksInPath().standardizedFileURL == url.standardizedFileURL else { call.reject("Review symbolic links manually"); return }
        do {
            if !FileManager.default.fileExists(atPath: url.path) { call.resolve([:]); return }
            let data = try coordinatedRead(url)
            guard let content = String(data: data, encoding: .utf8) else { call.reject("Instructions are not UTF-8"); return }
            call.resolve(["content": content])
        } catch { call.reject(error.localizedDescription) }
    }

    @objc func guidanceAppend(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), ["AGENTS.md", "CLAUDE.md"].contains(name),
              let addition = call.getString("addition"), let root = vaultURL else { call.reject("Invalid instruction file"); return }
        let url = root.appendingPathComponent(name)
        let expected = call.getString("expected")
        var failure: Error?
        var coordinatorError: NSError?
        NSFileCoordinator().coordinate(writingItemAt: url, options: [], error: &coordinatorError) { coordinated in
            do {
                guard coordinated.resolvingSymlinksInPath().standardizedFileURL == coordinated.standardizedFileURL else { throw CocoaError(.fileWriteNoPermission) }
                let current = FileManager.default.fileExists(atPath: coordinated.path) ? try String(contentsOf: coordinated, encoding: .utf8) : nil
                guard current == expected else { throw NSError(domain: "Merkzeug", code: 409, userInfo: [NSLocalizedDescriptionKey: localized("Instructions changed externally. Review the refreshed preview.", "Die Anweisungen wurden extern geändert. Prüfe die aktualisierte Vorschau.")]) }
                try ((current ?? "") + addition).write(to: coordinated, atomically: true, encoding: .utf8)
            } catch { failure = error }
        }
        if let error = coordinatorError ?? failure as NSError? { call.reject(error.localizedDescription) }
        else { call.resolve() }
    }

    @objc func writeFile(_ call: CAPPluginCall) {
        guard let path = call.getString("path"),
              let content = call.getString("content"),
              let url = fileURL(for: path, call: call) else {
            call.reject(localized("Missing parameters: 'path'/'content'.", "Parameter 'path'/'content' fehlen."))
            return
        }
        // Stale-Check: Wurde die Datei seit dem Laden extern geändert (z. B.
        // durch einen Pull in Working Copy), nicht blind überschreiben.
        if let expected = call.getDouble("expectedMtime"),
           let onDisk = Self.mtimeMs(url),
           onDisk > expected + 1 {
            call.reject(localized("The file was changed outside Merkzeug.", "Die Datei wurde außerhalb von Merkzeug geändert."), "CONFLICT")
            return
        }
        do {
            try coordinatedWrite(Data(content.utf8), to: url)
            call.resolve(["mtime": Self.mtimeMs(url) ?? 0])
        } catch {
            call.reject(localized("Save failed: \(error.localizedDescription)", "Speichern fehlgeschlagen: \(error.localizedDescription)"))
        }
    }

    @objc func readFileBase64(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
            return
        }
        do {
            let data = try coordinatedRead(url)
            call.resolve(["data": data.base64EncodedString()])
        } catch {
            call.reject(localized("Read failed: \(error.localizedDescription)", "Lesen fehlgeschlagen: \(error.localizedDescription)"))
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let notePath = call.getString("notePath"),
              let base64 = call.getString("base64"),
              let ext = call.getString("ext"),
              let data = Data(base64Encoded: base64) else {
            call.reject(localized("Missing or invalid parameters: 'notePath'/'base64'/'ext'.", "Parameter 'notePath'/'base64'/'ext' fehlen oder sind ungültig."))
            return
        }
        let noteDir = (notePath as NSString).deletingLastPathComponent
        let safeExt = ext.lowercased().filter { $0.isLetter || $0.isNumber }
        let fileName = "bild-\(UUID().uuidString.prefix(8).lowercased()).\(safeExt)"
        let folderName = ((notePath as NSString).lastPathComponent as NSString).deletingPathExtension + ".assets"
        let relDir = noteDir == "/" ? "/\(folderName)" : "\(noteDir)/\(folderName)"
        guard let url = fileURL(for: "\(relDir)/\(fileName)", call: call) else { return }
        do {
            try coordinatedWrite(data, to: url)
            let encoded = folderName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "#?"))) ?? folderName
            call.resolve(["relPath": "\(encoded)/\(fileName)"])
        } catch {
            call.reject(localized("Could not save image: \(error.localizedDescription)", "Bild konnte nicht gespeichert werden: \(error.localizedDescription)"))
        }
    }

    @objc func exists(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
            return
        }
        call.resolve(["exists": FileManager.default.fileExists(atPath: url.path)])
    }

    @objc func stat(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
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
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
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
            call.reject(localized("Could not create folder: \(err.localizedDescription)", "Ordner konnte nicht angelegt werden: \(err.localizedDescription)"))
            return
        }
        call.resolve()
    }

    @objc func deleteItem(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = fileURL(for: path, call: call) else {
            if call.getString("path") == nil { call.reject(localized("Missing parameter: 'path'.", "Parameter 'path' fehlt.")) }
            return
        }
        guard url.standardizedFileURL.path != vaultURL?.standardizedFileURL.path else {
            call.reject(localized("The vault folder itself cannot be deleted.", "Der Vault-Ordner selbst kann nicht gelöscht werden."))
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
            call.reject(localized("Delete failed: \(err.localizedDescription)", "Löschen fehlgeschlagen: \(err.localizedDescription)"))
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
                call.reject(localized("Missing parameters: 'from'/'to'.", "Parameter 'from'/'to' fehlen."))
            }
            return
        }
        if fromURL == toURL { call.resolve(); return }
        let fm = FileManager.default
        let oldAssets = fromURL.deletingPathExtension().appendingPathExtension("assets")
        let newAssets = toURL.deletingPathExtension().appendingPathExtension("assets")
        let hasAssets = fromURL.pathExtension.lowercased() == "md" && fm.fileExists(atPath: oldAssets.path)
        guard !fm.fileExists(atPath: toURL.path), !hasAssets || !fm.fileExists(atPath: newAssets.path) else {
            call.reject(localized("A destination note or attachment folder already exists.", "Am Ziel existiert bereits eine Notiz oder ein Bilderordner.")); return
        }
        guard !hasAssets || oldAssets.resolvingSymlinksInPath() == oldAssets else { call.reject("Review symbolic links manually"); return }
        var intents = [NSFileAccessIntent.writingIntent(with: fromURL, options: .forMoving), NSFileAccessIntent.writingIntent(with: toURL, options: [])]
        if hasAssets { intents += [NSFileAccessIntent.writingIntent(with: oldAssets, options: .forMoving), NSFileAccessIntent.writingIntent(with: newAssets, options: [])] }
        NSFileCoordinator().coordinate(with: intents, queue: OperationQueue.main) { error in
            if let error = error { call.reject(error.localizedDescription); return }
            let src = intents[0].url, dst = intents[1].url
            var movedAssets = false, movedNote = false
            var original: String?
            do {
                guard !fm.fileExists(atPath: dst.path), !hasAssets || !fm.fileExists(atPath: intents[3].url.path) else { throw CocoaError(.fileWriteFileExists) }
                if hasAssets {
                    original = try String(contentsOf: src, encoding: .utf8)
                    try fm.moveItem(at: intents[2].url, to: intents[3].url)
                    movedAssets = true
                }
                try fm.moveItem(at: src, to: dst)
                movedNote = true
                if let original = original {
                    let old = oldAssets.lastPathComponent, new = newAssets.lastPathComponent
                    let allowed = CharacterSet.urlPathAllowed.subtracting(CharacterSet(charactersIn: "#?"))
                    let rewritten = original.replacingOccurrences(of: old + "/", with: new + "/")
                        .replacingOccurrences(of: (old.addingPercentEncoding(withAllowedCharacters: allowed) ?? old) + "/", with: (new.addingPercentEncoding(withAllowedCharacters: allowed) ?? new) + "/")
                    if rewritten != original { try rewritten.write(to: dst, atomically: true, encoding: .utf8) }
                }
                call.resolve()
            } catch {
                // Recover both names on a failed multi-file operation; never overwrite a collision.
                if movedNote { try? fm.moveItem(at: dst, to: src) }
                if movedAssets { try? fm.moveItem(at: intents[3].url, to: intents[2].url) }
                call.reject(localized("Rename failed: \(error.localizedDescription)", "Umbenennen fehlgeschlagen: \(error.localizedDescription)"))
            }
        }
    }

    // MARK: - Suche

    /// Sucht case-insensitiv in Dateinamen und Inhalten aller Markdown-Dateien.
    /// Läuft im Hintergrund, damit die UI nicht blockiert.
    @objc func search(_ call: CAPPluginCall) {
        guard let vault = vaultURL else {
            call.reject(localized("No vault is open.", "Kein Vault geöffnet."))
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

private func localized(_ english: String, _ german: String) -> String {
    let language = Locale.preferredLanguages.first?.lowercased() ?? "en"
    return language == "de" || language.hasPrefix("de-") ? german : english
}

private final class MerkzeugPrintRenderer: UIPrintPageRenderer {
    private let page: CGRect
    init(landscape: Bool) {
        page = CGRect(x: 0, y: 0, width: landscape ? 842 : 595, height: landscape ? 595 : 842)
        super.init()
    }
    override var paperRect: CGRect { page }
    override var printableRect: CGRect { page.insetBy(dx: 28, dy: 28) }
}

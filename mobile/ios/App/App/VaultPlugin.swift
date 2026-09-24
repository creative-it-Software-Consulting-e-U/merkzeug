import Foundation
import UIKit
import WebKit
import UniformTypeIdentifiers
import Capacitor

// BEGIN VAULT PATH RESOLVER — Foundation-only, exercised by native regression tests.
enum VaultPathResolver {
    static func resolve(_ path: String, in vault: URL) -> URL? {
        // Normalize the existing root first. Foundation can shorten /private/var
        // for an existing directory but retain it for a not-yet-created child.
        let root = vault.standardizedFileURL
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let url = root.appendingPathComponent(trimmed).standardizedFileURL
        guard url.path == root.path || url.path.hasPrefix(root.path + "/") else {
            return nil
        }
        return url
    }
}
// END VAULT PATH RESOLVER

/// Zugriff auf den Vault-Ordner: Dokument-Picker, security-scoped Bookmark
/// und koordinierte Datei-Zugriffe (Pflicht bei File-Provider-Ordnern wie
/// denen von Working Copy).
@objc(VaultPlugin)
public class VaultPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "VaultPlugin"
    public let jsName = "Vault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "useCloudTemplateFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "templateFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickTemplateFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "templateFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printDocument", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportDocument", returnType: CAPPluginReturnPromise),
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
    private var pickingTemplates = false
    private var templatesURL: URL?
    private let templateQueue = DispatchQueue(label: "com.creative-it.merkzeug.templates")
    private static let templateBookmarkKey = "MerkzeugTemplateFolderBookmark"

    private var printingDocument = false

    @objc func printDocument(_ call: CAPPluginCall) { renderDocument(call, exportPDF: false) }
    @objc func exportDocument(_ call: CAPPluginCall) { renderDocument(call, exportPDF: true) }

    private func renderDocument(_ call: CAPPluginCall, exportPDF: Bool) {
        DispatchQueue.main.async {
            guard !self.printingDocument else { call.reject("A print dialog is already open"); return }
            guard (exportPDF || UIPrintInteractionController.isPrintingAvailable),
                  let webView = self.bridge?.webView,
                  let presenter = self.bridge?.viewController else {
                call.reject("Printing is not available"); return
            }
            self.printingDocument = true
            Task { @MainActor in
            do {
            // Paginate the prepared shared print view first, then hand the resulting
            // PDF to AirPrint. Menus and controls are excluded by print CSS.
            let renderer = try MerkzeugPrintRenderer(landscape: call.getBool("landscape") ?? false, margins: call.getObject("margins"))
            renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
            guard renderer.numberOfPages > 0 else {
                self.printingDocument = false; call.reject("No printable pages"); return
            }
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
            let furniture = TemplatePrintFurniture(parent: presenter.view)
            defer { furniture.close() }
            for page in 0..<renderer.numberOfPages {
                if let header = call.getString("header"), !header.isEmpty, renderer.headerRect.height > 0 {
                    if !header.contains("pageNumber"), let cached = renderer.headers[0] { renderer.headers[page] = cached }
                    else { renderer.headers[page] = try await furniture.image(html: header, size: renderer.headerRect.size, page: page + 1, total: renderer.numberOfPages, footer: false) }
                }
                if let footer = call.getString("footer"), !footer.isEmpty, renderer.footerRect.height > 0 {
                    if !footer.contains("pageNumber"), let cached = renderer.footers[0] { renderer.footers[page] = cached }
                    else { renderer.footers[page] = try await furniture.image(html: footer, size: renderer.footerRect.size, page: page + 1, total: renderer.numberOfPages, footer: true) }
                }
            }
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, renderer.paperRect, nil)
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
            for page in 0..<renderer.numberOfPages {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: page, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()
            #if DEBUG && targetEnvironment(simulator)
            if ProcessInfo.processInfo.environment["MERKZEUG_PRINT_PROOF"] == "1" {
                let proof = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Merkzeug-print-proof.pdf")
                try (data as Data).write(to: proof, options: .atomic)
            }
            #endif
            guard data.length > 0, exportPDF || UIPrintInteractionController.canPrint(data as Data) else {
                self.printingDocument = false; call.reject("Could not prepare printable PDF"); return
            }
            if exportPDF {
                let folder = FileManager.default.temporaryDirectory.appendingPathComponent("Merkzeug-PDF-" + UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let forbidden = CharacterSet(charactersIn: "/\\:<>\"|?*").union(.controlCharacters)
                let title = (call.getString("title") ?? "Merkzeug").components(separatedBy: forbidden).joined(separator: "-").trimmingCharacters(in: .whitespacesAndNewlines)
                let file = folder.appendingPathComponent(String((title.isEmpty ? "Merkzeug" : title).prefix(100)) + ".pdf")
                do { try (data as Data).write(to: file, options: .atomic) }
                catch { try? FileManager.default.removeItem(at: folder); throw error }
                let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                share.popoverPresentationController?.sourceView = presenter.view
                share.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: 40, width: 1, height: 1)
                share.completionWithItemsHandler = { _, _, _, error in
                    try? FileManager.default.removeItem(at: folder)
                    self.printingDocument = false
                    if let error { call.reject(error.localizedDescription) } else { call.resolve() }
                }
                presenter.present(share, animated: true)
                return
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
            } catch { self.printingDocument = false; call.reject(error.localizedDescription) }
            }
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
                if ProcessInfo.processInfo.environment["MERKZEUG_DEMO_TEMPLATES"] != nil {
                    let settings = demo.appendingPathComponent(".merkzeug/settings.json")
                    try? FileManager.default.createDirectory(at: settings.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try? "{\"pdfTemplate\":\"Acceptance\"}".write(to: settings, atomically: true, encoding: .utf8)
                }
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
            guard self.pendingPick == nil else { call.reject(localized("A folder picker is already open", "Eine Ordnerauswahl ist bereits geöffnet")); return }
            self.pickingTemplates = false
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
        if pickingTemplates {
            pickingTemplates = false
            templateQueue.async {
                do {
                    let bookmark = try url.bookmarkData()
                    UserDefaults.standard.set(bookmark, forKey: Self.templateBookmarkKey)
                    self.templatesURL?.stopAccessingSecurityScopedResource()
                    self.templatesURL = url
                    self.templateFolder(call)
                } catch { url.stopAccessingSecurityScopedResource(); call.reject(error.localizedDescription) }
            }
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
        if pickingTemplates, let call = pendingPick { templateFolder(call) }
        else { pendingPick?.resolve([:]) }
        pendingPick = nil
        pickingTemplates = false
    }

    // MARK: - PDF template folder (independent from the note vault)

    private func restoreTemplateFolder() throws -> URL? {
        if let url = templatesURL { return url }
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.environment["MERKZEUG_DEMO_MODE"] == "1",
           let json = ProcessInfo.processInfo.environment["MERKZEUG_DEMO_TEMPLATES"],
           let data = json.data(using: .utf8),
           let files = try? JSONDecoder().decode([String: String].self, from: data) {
            let root = FileManager.default.temporaryDirectory.appendingPathComponent("Demo Templates")
            if FileManager.default.fileExists(atPath: root.path) { try FileManager.default.removeItem(at: root) }
            for (path, text) in files {
                guard !path.hasPrefix("/"), !path.contains("\\"), !path.split(separator: "/").contains("..") else { throw CocoaError(.fileReadInvalidFileName) }
                let url = root.appendingPathComponent(path)
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try text.write(to: url, atomically: true, encoding: .utf8)
            }
            templatesURL = root
            return root
        }
        #endif
        guard let data = UserDefaults.standard.data(forKey: Self.templateBookmarkKey) else { return try cloudTemplateFolder() }
        var stale = false
        let url = try URL(resolvingBookmarkData: data, bookmarkDataIsStale: &stale)
        guard url.startAccessingSecurityScopedResource() else { throw CocoaError(.fileReadNoPermission) }
        if stale { UserDefaults.standard.set(try url.bookmarkData(), forKey: Self.templateBookmarkKey) }
        templatesURL = url
        return url
    }

    private func cloudTemplateFolder() throws -> URL? {
        guard FileManager.default.ubiquityIdentityToken != nil,
              let container = FileManager.default.url(forUbiquityContainerIdentifier: "iCloud.com.creative-it.merkzeug") else { return nil }
        let root = container.appendingPathComponent("Documents/Templates", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let starter = root.appendingPathComponent("Merkzeug", isDirectory: true)
        if !FileManager.default.fileExists(atPath: starter.path),
           let source = Bundle.main.resourceURL?.appendingPathComponent("public/pdf-templates/Merkzeug"),
           FileManager.default.fileExists(atPath: source.path) {
            // Never overwrite a user's template; another device may have installed it.
            do { try FileManager.default.copyItem(at: source, to: starter) }
            catch let error as NSError where error.code == NSFileWriteFileExistsError { }
        }
        return root
    }

    @objc func useCloudTemplateFolder(_ call: CAPPluginCall) {
        templateQueue.async {
            do {
                guard try self.cloudTemplateFolder() != nil else {
                    call.reject(localized("iCloud Drive is not available. Sign in and enable iCloud Drive in Settings.", "iCloud Drive ist nicht verfügbar. Melde dich an und aktiviere iCloud Drive in den Einstellungen.")); return
                }
                self.templatesURL?.stopAccessingSecurityScopedResource()
                self.templatesURL = nil
                UserDefaults.standard.removeObject(forKey: Self.templateBookmarkKey)
                self.templateFolder(call)
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func templateFolder(_ call: CAPPluginCall) {
        templateQueue.async { [self] in
        do {
            guard let root = try restoreTemplateFolder() else { call.resolve(["templates": [String]()]); return }
            var names = [String]()
            var readError: Error?
            var coordinationError: NSError?
            NSFileCoordinator().coordinate(readingItemAt: root, options: [], error: &coordinationError) { actual in
                do {
                    for entry in try FileManager.default.contentsOfDirectory(at: actual, includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles]) {
                        let values = try entry.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
                        if values.isDirectory == true && values.isSymbolicLink != true { names.append(entry.lastPathComponent) }
                    }
                } catch { readError = error }
            }
            if let error = coordinationError ?? readError as NSError? { throw error }
            call.resolve(["name": root.lastPathComponent, "templates": names.sorted(), "cloud": UserDefaults.standard.data(forKey: Self.templateBookmarkKey) == nil])
        } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func pickTemplateFolder(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingPick == nil else { call.reject(localized("A folder picker is already open", "Eine Ordnerauswahl ist bereits geöffnet")); return }
            self.pendingPick = call
            self.pickingTemplates = true
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
            picker.allowsMultipleSelection = false
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    @objc func templateFile(_ call: CAPPluginCall) {
        templateQueue.async { [self] in
        do {
            guard let root = try restoreTemplateFolder() else {
                call.reject(localized("iCloud Drive is not available. Sign in or choose a templates folder.", "iCloud Drive ist nicht verfügbar. Melde dich an oder wähle einen Vorlagenordner.")); return
            }
            guard let name = call.getString("name"),
                  !name.isEmpty, !name.hasPrefix("."), !name.contains("/"), !name.contains("\\"),
                  let path = call.getString("path"), !path.isEmpty, !path.hasPrefix("/"),
                  !path.contains("\\"), !path.split(separator: "/").contains("..") else { throw CocoaError(.fileReadInvalidFileName) }
            let template = root.appendingPathComponent(name, isDirectory: true).standardizedFileURL
            let url = template.appendingPathComponent(path).standardizedFileURL
            let resolved = url.resolvingSymlinksInPath().standardizedFileURL
            guard resolved.path.hasPrefix(root.resolvingSymlinksInPath().path + "/" + name + "/") else { throw CocoaError(.fileReadNoPermission) }
            guard FileManager.default.fileExists(atPath: template.path) else { throw CocoaError(.fileNoSuchFile) }
            // Coordination also requests provider download before reading cloud files.
            let data: Data
            do { data = try coordinatedRead(url) }
            catch let error as NSError where error.domain == NSCocoaErrorDomain && [NSFileReadNoSuchFileError, NSFileNoSuchFileError].contains(error.code) {
                call.resolve([:]); return
            }
            call.resolve(["data": data.base64EncodedString()])
        } catch { call.reject(error.localizedDescription) }
        }
    }

    // MARK: - Pfad-Helfer

    /// Vault-relative Pfade ("/Ordner/Notiz.md") in Datei-URLs übersetzen;
    /// Pfade außerhalb des Vaults werden abgewiesen.
    private func fileURL(for path: String, call: CAPPluginCall) -> URL? {
        guard let vault = vaultURL else {
            call.reject(localized("No vault is open.", "Kein Vault geöffnet."))
            return nil
        }
        guard let url = VaultPathResolver.resolve(path, in: vault) else {
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
            includingPropertiesForKeys: [.isDirectoryKey, .isSymbolicLinkKey],
            options: [.skipsHiddenFiles]
        )) ?? []
        let sorted = entries.sorted {
            $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending
        }
        for entry in sorted {
            if (try? entry.resourceValues(forKeys: [.isSymbolicLinkKey]))?.isSymbolicLink == true { continue }
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
        let sourceIsDirectory = (try? fromURL.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
        let hasAssets = !sourceIsDirectory && fromURL.pathExtension.lowercased() == "md" && fm.fileExists(atPath: oldAssets.path)
        guard !fm.fileExists(atPath: toURL.path), !hasAssets || !fm.fileExists(atPath: newAssets.path) else {
            call.reject(localized("A destination note or attachment folder already exists.", "Am Ziel existiert bereits eine Notiz oder ein Bilderordner.")); return
        }
        guard !hasAssets || oldAssets.resolvingSymlinksInPath() == oldAssets else { call.reject("Review symbolic links manually"); return }
        // Prepare all content changes in JS using the shared Markdown parser; validate and
        // commit them under native file coordination together with the filesystem move.
        var edits: [(src: URL, dst: URL, before: String, after: String)] = []
        var seenEdits = Set<String>()
        for item in call.getArray("edits", JSObject.self) ?? [] {
            guard let path = item["path"] as? String, let target = item["target"] as? String,
                  let before = item["before"] as? String, let after = item["after"] as? String,
                  let src = fileURL(for: path, call: call), let dst = fileURL(for: target, call: call) else { call.reject(localized("Invalid refactoring edit", "Ungültige Refactoring-Änderung")); return }
            guard src.resolvingSymlinksInPath() == src, dst.resolvingSymlinksInPath() == dst else { call.reject("Review symbolic links manually"); return }
            var expected = src.path
            for (old, new) in [(fromURL.path, toURL.path)] + (hasAssets ? [(oldAssets.path, newAssets.path)] : []) {
                if src.path == old || src.path.hasPrefix(old + "/") { expected = new + src.path.dropFirst(old.count); break }
            }
            guard src.pathExtension.lowercased() == "md", dst.path == expected, seenEdits.insert(src.path).inserted else { call.reject(localized("Invalid refactoring edit", "Ungültige Refactoring-Änderung")); return }
            edits.append((src, dst, before, after))
        }
        var intents = [NSFileAccessIntent.writingIntent(with: fromURL, options: .forMoving), NSFileAccessIntent.writingIntent(with: toURL, options: [])]
        if hasAssets { intents += [NSFileAccessIntent.writingIntent(with: oldAssets, options: .forMoving), NSFileAccessIntent.writingIntent(with: newAssets, options: [])] }
        for edit in edits { intents.append(NSFileAccessIntent.writingIntent(with: edit.src, options: [])) }
        NSFileCoordinator().coordinate(with: intents, queue: OperationQueue.main) { error in
            if let error = error { call.reject(error.localizedDescription); return }
            let src = intents[0].url, dst = intents[1].url
            var movedAssets = false, movedNote = false
            var written: [Int] = []
            do {
                guard !fm.fileExists(atPath: dst.path), !hasAssets || !fm.fileExists(atPath: intents[3].url.path) else { throw CocoaError(.fileWriteFileExists) }
                for edit in edits {
                    guard try String(contentsOf: edit.src, encoding: .utf8) == edit.before else { throw NSError(domain: "CONFLICT", code: 1, userInfo: [NSLocalizedDescriptionKey: localized("CONFLICT: File changed during refactoring", "CONFLICT: Datei wurde während des Refactorings geändert")]) }
                    guard fm.isWritableFile(atPath: edit.src.path) else { throw CocoaError(.fileWriteNoPermission) }
                }
                if hasAssets { try fm.moveItem(at: intents[2].url, to: intents[3].url); movedAssets = true }
                try fm.moveItem(at: src, to: dst); movedNote = true
                for (index, edit) in edits.enumerated() {
                    guard try String(contentsOf: edit.dst, encoding: .utf8) == edit.before else { throw NSError(domain: "CONFLICT", code: 1) }
                    try edit.after.write(to: edit.dst, atomically: true, encoding: .utf8)
                    written.append(index)
                }
                call.resolve()
            } catch {
                var recoveryFailed = false
                for index in written.reversed() {
                    let edit = edits[index]
                    do {
                        guard try String(contentsOf: edit.dst, encoding: .utf8) == edit.after else { throw NSError(domain: "CONFLICT", code: 1) }
                        try edit.before.write(to: edit.dst, atomically: true, encoding: .utf8)
                    } catch { recoveryFailed = true }
                }
                if movedNote { do { try fm.moveItem(at: dst, to: src) } catch { recoveryFailed = true } }
                if movedAssets { do { try fm.moveItem(at: intents[3].url, to: intents[2].url) } catch { recoveryFailed = true } }
                let detail = recoveryFailed ? localized("Some files require recovery. ", "Einige Dateien müssen wiederhergestellt werden. ") : ""
                call.reject(localized("Rename failed: \(detail)\(error.localizedDescription)", "Umbenennen fehlgeschlagen: \(detail)\(error.localizedDescription)"))
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
    private let content: CGRect
    let headerRect: CGRect
    let footerRect: CGRect
    var headers: [Int: UIImage] = [:]
    var footers: [Int: UIImage] = [:]
    init(landscape: Bool, margins: [String: Any]?) throws {
        page = CGRect(x: 0, y: 0, width: landscape ? 842 : 595, height: landscape ? 595 : 842)
        func points(_ side: String) -> CGFloat {
            guard let value = margins?[side] as? Double, value.isFinite, value >= 0 else { return 28 }
            return CGFloat(value) * 72 / 25.4
        }
        let top = points("top"), bottom = points("bottom"), left = points("left"), right = points("right")
        guard left + right < page.width - 20, top + bottom < page.height - 20 else {
            throw NSError(domain: "MerkzeugPrint", code: 1, userInfo: [NSLocalizedDescriptionKey: localized("Template margins leave no room for content.", "Die Vorlagenränder lassen keinen Platz für den Inhalt.")])
        }
        content = CGRect(x: left, y: top, width: page.width - left - right, height: page.height - top - bottom)
        headerRect = CGRect(x: left, y: 0, width: content.width, height: top)
        footerRect = CGRect(x: left, y: page.height - bottom, width: content.width, height: bottom)
        super.init()
    }
    override var paperRect: CGRect { page }
    override var printableRect: CGRect { content }
    override func drawPage(at pageIndex: Int, in printableRect: CGRect) {
        super.drawPage(at: pageIndex, in: printableRect)
        headers[pageIndex]?.draw(in: headerRect)
        footers[pageIndex]?.draw(in: footerRect)
    }
}

/// Render page furniture using WebKit CSS, separately from the paginated body.
/// The web view has no Capacitor bridge, persistent cookies or content JavaScript.
@MainActor
private final class TemplatePrintFurniture {
    private let webView: WKWebView
    init(parent: UIView) {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.defaultWebpagePreferences.allowsContentJavaScript = false
        webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.isScrollEnabled = false
        webView.isUserInteractionEnabled = false
        webView.accessibilityElementsHidden = true
        parent.insertSubview(webView, at: 0)
    }
    func close() { webView.stopLoading(); webView.removeFromSuperview() }
    func image(html: String, size: CGSize, page: Int, total: Int, footer: Bool) async throws -> UIImage {
        // HTML uses CSS pixels; PDF paper coordinates are 72-point inches.
        let scale: CGFloat = 96 / 72
        // Keep snapshots below the system status-bar material, which WebKit can
        // otherwise composite over the top of this offscreen rendering view.
        let origin = CGPoint(x: 0, y: (webView.superview?.safeAreaInsets.top ?? 0) + 100)
        webView.frame = CGRect(origin: origin, size: CGSize(width: size.width * scale, height: size.height * scale))
        let marker = UUID().uuidString
        let alignment = footer ? "flex-start" : "flex-end"
        webView.loadHTMLString("<html data-merkzeug-print='\(marker)'><head><meta name='viewport' content='width=device-width,initial-scale=1'><style>html,body{margin:0;padding:0;width:100%;height:100%;background:white;color:black;color-scheme:light}body{font:10px Arial;display:flex;flex-direction:column;justify-content:\(alignment);box-sizing:border-box;padding:8px 0}</style></head><body>\(html)</body></html>", baseURL: nil)
        var ready = false
        for _ in 0..<100 {
            if let value = try? await webView.evaluateJavaScript("document.documentElement.dataset.merkzeugPrint === '\(marker)' && document.readyState === 'complete' && document.fonts.status === 'loaded' && Array.from(document.images).every(i => i.complete)"), (value as? Bool) == true { ready = true; break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        guard ready else { throw NSError(domain: "MerkzeugPrint", code: 2, userInfo: [NSLocalizedDescriptionKey: localized("Template header or footer did not finish rendering.", "Kopf- oder Fußzeile der Vorlage konnte nicht fertig dargestellt werden.")]) }
        let imagesOK = try await webView.evaluateJavaScript("Array.from(document.images).every(i => i.naturalWidth > 0)")
        guard (imagesOK as? Bool) == true else { throw NSError(domain: "MerkzeugPrint", code: 3, userInfo: [NSLocalizedDescriptionKey: localized("A template header or footer image is unavailable.", "Ein Bild in der Kopf- oder Fußzeile ist nicht verfügbar.")]) }
        _ = try await webView.evaluateJavaScript("document.querySelectorAll('.pageNumber').forEach(e => e.textContent = '\(page)'); document.querySelectorAll('.totalPages').forEach(e => e.textContent = '\(total)'); true")
        try await Task.sleep(nanoseconds: 20_000_000)
        let config = WKSnapshotConfiguration()
        config.rect = webView.bounds
        return try await webView.takeSnapshot(configuration: config)
    }
}

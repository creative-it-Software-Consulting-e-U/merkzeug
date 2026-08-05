import AppKit
import SwiftUI
import MarkdownEngine

/// Ein geöffneter Tab: entweder ein Markdown-Editor oder eine Ordner-Übersicht.
final class EditorTab: ObservableObject, Identifiable {
    enum Kind { case markdown, folder }

    let id = UUID()
    let kind: Kind
    @Published var url: URL
    let document: MarkdownDocument?
    let controller: EditorController?

    /// Navigationsmodus: Editor ist read-only, Links laden im selben Tab.
    @Published var isNavigationMode = false
    /// Zeigt der Tab gerade eine Ordner-Übersicht statt des Editors?
    /// (Nur im Navigationsmodus möglich, wenn ein Ordner-Link geladen wurde.)
    @Published var showsFolder = false
    /// Historie für Zurück/Vorwärts; bleibt beim Verlassen des Modus erhalten.
    @Published var backStack: [URL] = []
    @Published var forwardStack: [URL] = []

    init(url: URL) {
        self.kind = .markdown
        self.url = url
        let document = MarkdownDocument(url: url)
        self.document = document
        self.controller = EditorController(document: document)
    }

    init(folder url: URL) {
        self.kind = .folder
        self.url = url
        self.document = nil
        self.controller = nil
    }

    var title: String {
        kind == .folder || showsFolder
            ? url.lastPathComponent
            : url.deletingPathExtension().lastPathComponent
    }
}

/// Eine Sektion (Split-Bereich) mit eigener Tab-Leiste.
final class Pane: ObservableObject, Identifiable {
    let id = UUID()
    @Published var tabs: [EditorTab] = []
    @Published var selectedTabID: UUID?

    var selectedTab: EditorTab? { tabs.first { $0.id == selectedTabID } }
}

/// Zustand für das Link-Sheet.
struct LinkSheetState: Identifiable {
    let id = UUID()
    var text: String
    var url: String
    var range: NSRange
    var paneID: UUID
}

/// Zustand für das Umbenennen-Sheet.
struct RenameSheetState: Identifiable {
    let id = UUID()
    var url: URL
    var name: String
}

/// Zustand *eines* Fensters: eigener Vault, eigene Sektionen und Tabs.
final class AppState: ObservableObject {

    /// Alle lebenden Fenster-Instanzen (schwach), z. B. um beim Beenden
    /// überall zu sichern.
    private static let registry = NSHashTable<AppState>.weakObjects()

    static func saveAllWindows() {
        for state in registry.allObjects { state.saveAll() }
    }

    let vault = VaultStore()

    /// Vault, den dieses Fenster beim Start öffnen soll (vom Ursprungsfenster
    /// übernommen); nil beim allerersten Fenster.
    private let initialVaultPath: String?

    @Published var panes: [Pane] = [Pane()]
    @Published var activePaneID: UUID
    @Published var linkSheet: LinkSheetState?
    @Published var renameSheet: RenameSheetState?
    @Published var errorMessage: String?
    @Published var infoMessage: String?

    init(initialVaultPath: String? = nil) {
        self.initialVaultPath = initialVaultPath
        let firstPane = Pane()
        panes = [firstPane]
        activePaneID = firstPane.id
        vault.onFileMoved = { [weak self] old, new in
            self?.fileMoved(from: old, to: new)
        }
        vault.onFileDeleted = { [weak self] url in
            self?.fileDeleted(url)
        }
        Self.registry.add(self)
    }

    var activePane: Pane {
        panes.first { $0.id == activePaneID } ?? panes[0]
    }

    var activeTab: EditorTab? { activePane.selectedTab }
    var activeTextView: MarkdownTextView? { activeTab?.controller?.textView }
    var isSplit: Bool { panes.count > 1 }

    // MARK: - Start

    func bootstrap() {
        if let initialVaultPath,
           FileManager.default.fileExists(atPath: initialVaultPath) {
            vault.open(URL(fileURLWithPath: initialVaultPath))
            return
        }
        if let envPath = ProcessInfo.processInfo.environment["MYNOTION_VAULT"],
           FileManager.default.fileExists(atPath: envPath) {
            vault.open(URL(fileURLWithPath: envPath))
            return
        }
        if let saved = UserDefaults.standard.string(forKey: "vaultPath"),
           FileManager.default.fileExists(atPath: saved) {
            vault.open(URL(fileURLWithPath: saved))
            return
        }
        chooseVault()
    }

    /// Öffnet einen Vault direkt (z. B. aus der „Zuletzt geöffnet“-Liste).
    func openVault(_ url: URL) {
        guard FileManager.default.fileExists(atPath: url.path) else {
            errorMessage = "Vault nicht gefunden: \(url.path)"
            return
        }
        guard url.mnCanonical != vault.vaultURL else { return }
        saveAll()
        closeAllTabs()
        vault.open(url)
    }

    func chooseVault() {
        let panel = NSOpenPanel()
        panel.title = "Vault-Ordner auswählen"
        panel.message = "Wähle den Ordner mit deinen Markdown-Dateien."
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.prompt = "Öffnen"
        if panel.runModal() == .OK, let url = panel.url {
            saveAll()
            closeAllTabs()
            vault.open(url)
        }
    }

    // MARK: - Tabs öffnen / schließen

    func open(_ url: URL) {
        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory),
           isDirectory.boolValue {
            openFolder(url)
            return
        }
        if url.pathExtension.lowercased() != "md" {
            NSWorkspace.shared.open(url)
            return
        }
        for pane in panes {
            if let tab = pane.tabs.first(where: { $0.url == url }) {
                pane.selectedTabID = tab.id
                activePaneID = pane.id
                focusActiveEditor()
                return
            }
        }
        let tab = EditorTab(url: url)
        wire(tab)
        let pane = activePane
        pane.tabs.append(tab)
        pane.selectedTabID = tab.id
        focusActiveEditor()
    }

    /// Öffnet einen Vault-Ordner: klappt ihn in der Sidebar auf und zeigt
    /// eine Übersicht in einem eigenen Tab. Ordner außerhalb des Vaults
    /// gehen an den Finder.
    func openFolder(_ url: URL) {
        let target = url.mnCanonical
        guard vault.isInVault(target) else {
            NSWorkspace.shared.open(target)
            return
        }
        vault.reveal(target)
        for pane in panes {
            if let tab = pane.tabs.first(where: { $0.kind == .folder && $0.url.path == target.path }) {
                pane.selectedTabID = tab.id
                activePaneID = pane.id
                return
            }
        }
        let tab = EditorTab(folder: target)
        let pane = activePane
        pane.tabs.append(tab)
        pane.selectedTabID = tab.id
    }

    private func wire(_ tab: EditorTab) {
        guard let controller = tab.controller else { return }
        controller.onOpenLink = { [weak self, weak tab] link in
            guard let self, let tab else { return }
            self.handleLink(link, from: tab)
        }
        controller.textView.onFocus = { [weak self, weak tab] in
            guard let self, let tab else { return }
            if let pane = self.panes.first(where: { p in p.tabs.contains(where: { $0.id == tab.id }) }) {
                if self.activePaneID != pane.id { self.activePaneID = pane.id }
            }
        }
        controller.textView.onRequestLinkSheet = { [weak self, weak tab] in
            guard let self, let tab else { return }
            self.showLinkSheet(for: tab)
        }
        controller.textView.onNavigateBack = { [weak self, weak tab] in
            guard let self, let tab else { return }
            self.goBack(tab)
        }
        controller.textView.onNavigateForward = { [weak self, weak tab] in
            guard let self, let tab else { return }
            self.goForward(tab)
        }
    }

    // MARK: - Navigationsmodus

    /// Schaltet den Navigationsmodus des aktiven Tabs um (⌘R).
    func toggleNavigationMode() {
        guard let tab = activeTab, tab.kind == .markdown, let controller = tab.controller else { return }
        tab.isNavigationMode.toggle()
        controller.setReadOnly(tab.isNavigationMode)
        if !tab.isNavigationMode, tab.showsFolder {
            // Beim Verlassen des Modus zeigt der Tab wieder die zuletzt
            // geladene Notiz; der Ordner bleibt über „Zurück" erreichbar.
            tab.backStack.append(tab.url)
            tab.forwardStack.removeAll()
            tab.showsFolder = false
            tab.url = controller.document.fileURL
        }
    }

    /// Lädt eine Datei oder einen Vault-Ordner im selben Tab und schreibt
    /// die Historie fort.
    func navigate(_ tab: EditorTab, to url: URL) {
        guard tab.controller != nil, url != tab.url else { return }
        tab.backStack.append(tab.url)
        tab.forwardStack.removeAll()
        show(url, in: tab)
    }

    /// Zeigt ein Historien-/Linkziel im Tab an: Ordner als Übersicht,
    /// Markdown-Dateien im Editor.
    private func show(_ target: URL, in tab: EditorTab) {
        guard let controller = tab.controller else { return }
        var isDirectory: ObjCBool = false
        FileManager.default.fileExists(atPath: target.path, isDirectory: &isDirectory)
        if isDirectory.boolValue {
            controller.document.save()
            tab.showsFolder = true
            vault.reveal(target)
        } else {
            tab.showsFolder = false
            controller.navigate(to: target)
        }
        tab.url = target
    }

    func goBack(_ tab: EditorTab? = nil) {
        guard let tab = tab ?? activeTab,
              tab.isNavigationMode, tab.controller != nil else { return }
        while let target = tab.backStack.popLast() {
            guard FileManager.default.fileExists(atPath: target.path) else { continue }
            tab.forwardStack.append(tab.url)
            show(target, in: tab)
            return
        }
    }

    func goForward(_ tab: EditorTab? = nil) {
        guard let tab = tab ?? activeTab,
              tab.isNavigationMode, tab.controller != nil else { return }
        while let target = tab.forwardStack.popLast() {
            guard FileManager.default.fileExists(atPath: target.path) else { continue }
            tab.backStack.append(tab.url)
            show(target, in: tab)
            return
        }
    }

    /// Öffnet einen Eintrag aus der Ordner-Übersicht: im Navigationsmodus
    /// im selben Tab, sonst wie ein normaler Sidebar-Klick.
    func openFolderEntry(_ url: URL, from tab: EditorTab) {
        var isDirectory: ObjCBool = false
        FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
        let inSameTab = tab.isNavigationMode && tab.kind == .markdown
            && (isDirectory.boolValue
                ? vault.isInVault(url.mnCanonical)
                : url.pathExtension.lowercased() == "md")
        if inSameTab {
            navigate(tab, to: url.mnCanonical)
        } else {
            open(url)
        }
    }

    func close(_ tab: EditorTab) {
        tab.document?.save()
        for pane in panes {
            if let idx = pane.tabs.firstIndex(where: { $0.id == tab.id }) {
                pane.tabs.remove(at: idx)
                if pane.selectedTabID == tab.id {
                    pane.selectedTabID = pane.tabs.indices.contains(idx)
                        ? pane.tabs[idx].id
                        : pane.tabs.last?.id
                }
                collapseIfEmpty(pane)
                return
            }
        }
    }

    func closeActiveTab() {
        if let tab = activeTab { close(tab) }
    }

    func closeOtherTabs(keeping tab: EditorTab) {
        guard let pane = panes.first(where: { p in p.tabs.contains(where: { $0.id == tab.id }) }) else { return }
        for other in pane.tabs where other.id != tab.id {
            other.document?.save()
        }
        pane.tabs.removeAll { $0.id != tab.id }
        pane.selectedTabID = tab.id
    }

    private func closeAllTabs() {
        for pane in panes {
            pane.tabs.removeAll()
            pane.selectedTabID = nil
        }
        panes = [panes[0]]
        activePaneID = panes[0].id
    }

    private func collapseIfEmpty(_ pane: Pane) {
        if pane.tabs.isEmpty, panes.count > 1, let idx = panes.firstIndex(where: { $0.id == pane.id }) {
            panes.remove(at: idx)
            if activePaneID == pane.id { activePaneID = panes[0].id }
        }
    }

    // MARK: - Sektionen

    func toggleSplit() {
        if panes.count > 1 {
            let second = panes[1]
            for tab in second.tabs { panes[0].tabs.append(tab) }
            if panes[0].selectedTabID == nil { panes[0].selectedTabID = panes[0].tabs.last?.id }
            panes.removeAll { $0.id == second.id }
            activePaneID = panes[0].id
        } else {
            let pane = Pane()
            panes.append(pane)
            activePaneID = pane.id
        }
    }

    /// Tab (per ID-String) in eine andere Sektion verschieben.
    func moveTab(idString: String, to target: Pane) {
        guard let uuid = UUID(uuidString: idString) else { return }
        moveTab(id: uuid, to: target)
    }

    func moveTab(id: UUID, to target: Pane) {
        guard let source = panes.first(where: { p in p.tabs.contains(where: { $0.id == id }) }),
              source.id != target.id,
              let idx = source.tabs.firstIndex(where: { $0.id == id })
        else { return }
        let tab = source.tabs.remove(at: idx)
        if source.selectedTabID == id {
            source.selectedTabID = source.tabs.indices.contains(idx)
                ? source.tabs[idx].id
                : source.tabs.last?.id
        }
        target.tabs.append(tab)
        target.selectedTabID = tab.id
        activePaneID = target.id
        collapseIfEmpty(source)
        focusActiveEditor()
    }

    func moveActiveTabToOtherPane() {
        guard let tab = activeTab else { return }
        if panes.count == 1 { panes.append(Pane()) }
        guard let target = panes.first(where: { pane in
            !pane.tabs.contains(where: { $0.id == tab.id })
        }) else { return }
        moveTab(id: tab.id, to: target)
    }

    func focusActiveEditor() {
        let textView = activeTextView
        DispatchQueue.main.async {
            textView?.window?.makeFirstResponder(textView)
        }
    }

    // MARK: - Speichern

    func saveActive() { activeTab?.document?.save() }

    func saveAll() {
        for pane in panes {
            for tab in pane.tabs {
                tab.document?.save()
            }
        }
    }

    // MARK: - Git

    /// Sichert alle offenen Tabs und führt dann Commit & Push im Vault aus.
    func commitAndPush(message: String) {
        saveAll()
        vault.git.commitAndPush(message: message) { [weak self] result in
            switch result {
            case .success(let note):
                if let note { self?.infoMessage = note }
            case .failure(let error):
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    /// Sichert alle offenen Tabs und holt dann Änderungen vom Remote.
    func pull() {
        saveAll()
        vault.git.pull { [weak self] result in
            switch result {
            case .success(let note):
                if let note { self?.infoMessage = note }
            case .failure(let error):
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Dateioperationen (mit Fehleranzeige)

    func newNote(in directory: URL? = nil) {
        guard let dir = directory ?? vault.vaultURL else { return }
        do {
            let url = try vault.createNote(in: dir)
            open(url)
            renameSheet = RenameSheetState(url: url, name: url.deletingPathExtension().lastPathComponent)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func newFolder(in directory: URL? = nil) {
        guard let dir = directory ?? vault.vaultURL else { return }
        do {
            _ = try vault.createFolder(in: dir)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func rename(_ url: URL, to newName: String) {
        do {
            _ = try vault.rename(url, to: newName)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func move(_ url: URL, into destination: URL) {
        do {
            _ = try vault.move(url, into: destination)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func trash(_ url: URL) {
        do {
            try vault.trash(url)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Reaktion auf Verschieben/Löschen

    private func fileMoved(from old: URL, to new: URL) {
        let oldPath = old.path
        func remapped(_ url: URL) -> URL? {
            if url == old { return new }
            if url.path.hasPrefix(oldPath + "/") {
                // Datei lag in einem verschobenen/umbenannten Ordner
                let suffix = String(url.path.dropFirst(oldPath.count))
                return URL(fileURLWithPath: new.path + suffix)
            }
            return nil
        }
        for pane in panes {
            for tab in pane.tabs {
                if let newURL = remapped(tab.url) {
                    tab.url = newURL
                    if !tab.showsFolder { tab.controller?.updateFileURL(newURL) }
                }
                if tab.showsFolder, let document = tab.document,
                   let newDocURL = remapped(document.fileURL) {
                    // Die im Hintergrund geladene Notiz ist mitgewandert.
                    tab.controller?.updateFileURL(newDocURL)
                }
                tab.backStack = tab.backStack.map { remapped($0) ?? $0 }
                tab.forwardStack = tab.forwardStack.map { remapped($0) ?? $0 }
            }
            pane.objectWillChange.send()
        }
    }

    private func fileDeleted(_ url: URL) {
        let path = url.path
        for pane in panes {
            for tab in pane.tabs {
                tab.backStack.removeAll { $0 == url || $0.path.hasPrefix(path + "/") }
                tab.forwardStack.removeAll { $0 == url || $0.path.hasPrefix(path + "/") }
            }
            let doomed = pane.tabs.filter { $0.url == url || $0.url.path.hasPrefix(path + "/") }
            for tab in doomed {
                if let idx = pane.tabs.firstIndex(where: { $0.id == tab.id }) {
                    pane.tabs.remove(at: idx)
                    if pane.selectedTabID == tab.id {
                        pane.selectedTabID = pane.tabs.last?.id
                    }
                }
            }
        }
        if let pane = panes.first(where: { $0.tabs.isEmpty }), panes.count > 1 {
            collapseIfEmpty(pane)
        }
    }

    // MARK: - Links

    private func handleLink(_ link: String, from tab: EditorTab) {
        if link.hasPrefix("http://") || link.hasPrefix("https://") || link.hasPrefix("mailto:") {
            if let url = URL(string: link) { NSWorkspace.shared.open(url) }
            return
        }
        let decoded = link.removingPercentEncoding ?? link
        if let resolved = Self.resolveLocalLink(
            decoded,
            baseDirectory: tab.url.deletingLastPathComponent(),
            vaultRoot: vault.vaultURL
        ) {
            let isDirectory = (try? resolved.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory ?? false
            let navigable = isDirectory
                ? vault.isInVault(resolved)
                : resolved.pathExtension.lowercased() == "md"
            if tab.isNavigationMode, tab.kind == .markdown, navigable {
                navigate(tab, to: resolved)
            } else {
                open(resolved)
            }
        } else if let url = URL(string: link), url.scheme != nil {
            NSWorkspace.shared.open(url)
        } else {
            errorMessage = "Link-Ziel nicht gefunden: \(decoded)"
        }
    }

    /// Löst einen Datei-Link auf: absolute Pfade, `~`, Pfade relativ zur
    /// aktuellen Datei und als Fallback relativ zum Vault-Wurzelordner.
    /// Gibt nil zurück, wenn kein Ziel existiert.
    static func resolveLocalLink(_ decoded: String, baseDirectory: URL, vaultRoot: URL?) -> URL? {
        var candidates: [URL] = []
        if decoded.hasPrefix("/") {
            candidates.append(URL(fileURLWithPath: decoded))
        } else if decoded.hasPrefix("~") {
            candidates.append(URL(fileURLWithPath: (decoded as NSString).expandingTildeInPath))
        } else {
            candidates.append(baseDirectory.appendingPathComponent(decoded))
            if let vaultRoot {
                candidates.append(vaultRoot.appendingPathComponent(decoded))
            }
        }
        for candidate in candidates {
            let url = candidate.mnCanonical
            if FileManager.default.fileExists(atPath: url.path) { return url }
        }
        return nil
    }

    func showLinkSheet(for tab: EditorTab? = nil) {
        guard let tab = tab ?? activeTab, let controller = tab.controller else { return }
        guard let pane = panes.first(where: { p in p.tabs.contains(where: { $0.id == tab.id }) }) else { return }
        let ctx = controller.textView.currentLinkContext()
        linkSheet = LinkSheetState(text: ctx.text, url: ctx.url, range: ctx.range, paneID: pane.id)
    }

    func applyLinkSheet(_ state: LinkSheetState, text: String, url: String) {
        guard let pane = panes.first(where: { $0.id == state.paneID }),
              let tab = pane.selectedTab else { return }
        tab.controller?.textView.applyLink(text: text, url: url, range: state.range)
    }
}

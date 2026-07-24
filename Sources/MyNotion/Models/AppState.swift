import AppKit
import SwiftUI
import MarkdownEngine

/// Ein geöffneter Tab mit eigenem Editor.
final class EditorTab: ObservableObject, Identifiable {
    let id = UUID()
    @Published var url: URL
    let document: MarkdownDocument
    let controller: EditorController

    init(url: URL) {
        self.url = url
        let document = MarkdownDocument(url: url)
        self.document = document
        self.controller = EditorController(document: document)
    }

    var title: String { url.deletingPathExtension().lastPathComponent }
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

final class AppState: ObservableObject {

    static let shared = AppState()

    let vault = VaultStore()

    @Published var panes: [Pane] = [Pane()]
    @Published var activePaneID: UUID
    @Published var linkSheet: LinkSheetState?
    @Published var renameSheet: RenameSheetState?
    @Published var errorMessage: String?

    private init() {
        let firstPane = Pane()
        panes = [firstPane]
        activePaneID = firstPane.id
        vault.onFileMoved = { [weak self] old, new in
            self?.fileMoved(from: old, to: new)
        }
        vault.onFileDeleted = { [weak self] url in
            self?.fileDeleted(url)
        }
    }

    var activePane: Pane {
        panes.first { $0.id == activePaneID } ?? panes[0]
    }

    var activeTab: EditorTab? { activePane.selectedTab }
    var activeTextView: MarkdownTextView? { activeTab?.controller.textView }
    var isSplit: Bool { panes.count > 1 }

    // MARK: - Start

    func bootstrap() {
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

    private func wire(_ tab: EditorTab) {
        tab.controller.onOpenLink = { [weak self, weak tab] link in
            guard let self, let tab else { return }
            self.handleLink(link, from: tab)
        }
        tab.controller.textView.onFocus = { [weak self, weak tab] in
            guard let self, let tab else { return }
            if let pane = self.panes.first(where: { p in p.tabs.contains(where: { $0.id == tab.id }) }) {
                if self.activePaneID != pane.id { self.activePaneID = pane.id }
            }
        }
        tab.controller.textView.onRequestLinkSheet = { [weak self, weak tab] in
            guard let self, let tab else { return }
            self.showLinkSheet(for: tab)
        }
    }

    func close(_ tab: EditorTab) {
        tab.document.save()
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
            other.document.save()
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

    func saveActive() { activeTab?.document.save() }

    func saveAll() {
        for pane in panes {
            for tab in pane.tabs {
                tab.document.save()
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
        for pane in panes {
            for tab in pane.tabs {
                if tab.url == old {
                    tab.url = new
                    tab.controller.updateFileURL(new)
                } else if tab.url.path.hasPrefix(oldPath + "/") {
                    // Datei lag in einem verschobenen/umbenannten Ordner
                    let suffix = String(tab.url.path.dropFirst(oldPath.count))
                    let newURL = URL(fileURLWithPath: new.path + suffix)
                    tab.url = newURL
                    tab.controller.updateFileURL(newURL)
                }
            }
            pane.objectWillChange.send()
        }
    }

    private func fileDeleted(_ url: URL) {
        let path = url.path
        for pane in panes {
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
        let resolved = tab.url.deletingLastPathComponent()
            .appendingPathComponent(decoded).standardizedFileURL
        if FileManager.default.fileExists(atPath: resolved.path) {
            open(resolved)
        } else if let url = URL(string: link), url.scheme != nil {
            NSWorkspace.shared.open(url)
        } else {
            errorMessage = "Link-Ziel nicht gefunden: \(decoded)"
        }
    }

    func showLinkSheet(for tab: EditorTab? = nil) {
        guard let tab = tab ?? activeTab else { return }
        guard let pane = panes.first(where: { p in p.tabs.contains(where: { $0.id == tab.id }) }) else { return }
        let ctx = tab.controller.textView.currentLinkContext()
        linkSheet = LinkSheetState(text: ctx.text, url: ctx.url, range: ctx.range, paneID: pane.id)
    }

    func applyLinkSheet(_ state: LinkSheetState, text: String, url: String) {
        guard let pane = panes.first(where: { $0.id == state.paneID }),
              let tab = pane.selectedTab else { return }
        tab.controller.textView.applyLink(text: text, url: url, range: state.range)
    }
}

import AppKit
import MarkdownEngine

/// Ein geöffnetes Markdown-Dokument: hält den TextStorage des Editors
/// und kümmert sich um Laden, Serialisieren und Autosave.
final class MarkdownDocument: ObservableObject {

    @Published private(set) var isDirty = false

    private(set) var fileURL: URL
    let textStorage = NSTextStorage()

    private var autosaveTimer: Timer?

    init(url: URL) {
        self.fileURL = url
        load()
    }

    var baseDirectory: URL { fileURL.deletingLastPathComponent() }

    func load() {
        let text = (try? String(contentsOf: fileURL, encoding: .utf8)) ?? ""
        let blocks = MarkdownParser.parse(text)
        let attributed = AttributedBuilder(baseURL: baseDirectory).build(blocks)
        textStorage.setAttributedString(attributed)
        isDirty = false
    }

    /// Vom Editor nach jeder Änderung aufgerufen; speichert verzögert.
    func noteEdited() {
        isDirty = true
        autosaveTimer?.invalidate()
        autosaveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { [weak self] _ in
            self?.save()
        }
    }

    func save() {
        guard isDirty else { return }
        autosaveTimer?.invalidate()
        autosaveTimer = nil
        let markdown = MarkdownSerializer.markdown(from: textStorage)
        do {
            try markdown.write(to: fileURL, atomically: true, encoding: .utf8)
            isDirty = false
        } catch {
            NSLog("MyNotion: Speichern fehlgeschlagen: \(error.localizedDescription)")
        }
    }

    /// Nach Umbenennen/Verschieben der Datei.
    func updateURL(_ newURL: URL) {
        fileURL = newURL
    }
}

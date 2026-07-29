import SwiftUI
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        AppState.saveAllWindows()
        return .terminateNow
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

/// Beschreibt ein zu öffnendes Fenster. Die eindeutige ID sorgt dafür,
/// dass auch für denselben Vault ein *neues* Fenster entsteht (statt das
/// vorhandene zu fokussieren).
struct WindowRequest: Codable, Hashable {
    var id = UUID()
    var vaultPath: String?
}

@main
struct MyNotionApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup(for: WindowRequest.self) { $request in
            WindowRootView(request: request)
                .frame(minWidth: 900, minHeight: 560)
        } defaultValue: {
            WindowRequest()
        }
        .commands {
            AppCommands()
        }
    }
}

/// Wurzel eines Fensters: besitzt den fensterspezifischen AppState.
struct WindowRootView: View {
    @StateObject private var app: AppState

    init(request: WindowRequest) {
        _app = StateObject(wrappedValue: AppState(initialVaultPath: request.vaultPath))
    }

    var body: some View {
        ContentView(app: app)
            .focusedSceneValue(\.appState, app)
            .onDisappear { app.saveAll() }
    }
}

/// Reicht den AppState des aktiven Fensters an die Menübefehle durch.
struct AppStateFocusedKey: FocusedValueKey {
    typealias Value = AppState
}

extension FocusedValues {
    var appState: AppState? {
        get { self[AppStateFocusedKey.self] }
        set { self[AppStateFocusedKey.self] = newValue }
    }
}

struct AppCommands: Commands {
    @FocusedValue(\.appState) private var app: AppState?
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("Neue Notiz") { app?.newNote() }
                .keyboardShortcut("n", modifiers: .command)
                .disabled(app == nil)
            Button("Neuer Ordner") { app?.newFolder() }
                .keyboardShortcut("n", modifiers: [.command, .shift])
                .disabled(app == nil)
            Button("Neues Fenster") {
                openWindow(value: WindowRequest(vaultPath: app?.vault.vaultURL?.path))
            }
            .keyboardShortcut("n", modifiers: [.command, .option])
            Divider()
            Button("Vault öffnen…") { app?.chooseVault() }
                .keyboardShortcut("o", modifiers: .command)
                .disabled(app == nil)
            Divider()
            Button("Tab schließen") { app?.closeActiveTab() }
                .keyboardShortcut("w", modifiers: .command)
                .disabled(app == nil)
        }
        CommandGroup(replacing: .saveItem) {
            Button("Sichern") { app?.saveActive() }
                .keyboardShortcut("s", modifiers: .command)
                .disabled(app == nil)
            Button("Alle sichern") { app?.saveAll() }
                .keyboardShortcut("s", modifiers: [.command, .option])
                .disabled(app == nil)
        }
        CommandMenu("Format") {
            Button("Fett") { app?.activeTextView?.toggleBold() }
                .keyboardShortcut("b", modifiers: .command)
            Button("Kursiv") { app?.activeTextView?.toggleItalic() }
                .keyboardShortcut("i", modifiers: .command)
            Button("Durchgestrichen") { app?.activeTextView?.toggleStrikethrough() }
                .keyboardShortcut("x", modifiers: [.command, .shift])
            Button("Inline-Code") { app?.activeTextView?.toggleInlineCode() }
                .keyboardShortcut("e", modifiers: .command)
            Divider()
            Button("Text") { app?.activeTextView?.setHeadingLevel(0) }
                .keyboardShortcut("0", modifiers: .command)
            Button("Überschrift 1") { app?.activeTextView?.setHeadingLevel(1) }
                .keyboardShortcut("1", modifiers: .command)
            Button("Überschrift 2") { app?.activeTextView?.setHeadingLevel(2) }
                .keyboardShortcut("2", modifiers: .command)
            Button("Überschrift 3") { app?.activeTextView?.setHeadingLevel(3) }
                .keyboardShortcut("3", modifiers: .command)
            Divider()
            Button("Aufzählung") { app?.activeTextView?.setList(ordered: false) }
                .keyboardShortcut("8", modifiers: [.command, .shift])
            Button("Nummerierte Liste") { app?.activeTextView?.setList(ordered: true) }
                .keyboardShortcut("7", modifiers: [.command, .shift])
            Button("Zitat") { app?.activeTextView?.toggleQuote() }
                .keyboardShortcut("9", modifiers: [.command, .shift])
            Button("Codeblock") { app?.activeTextView?.toggleCodeBlock() }
                .keyboardShortcut("c", modifiers: [.command, .option])
            Divider()
            Button("Link…") { app?.showLinkSheet() }
                .keyboardShortcut("k", modifiers: .command)
            Button("Tabelle einfügen") { app?.activeTextView?.insertTable(rows: 3, cols: 3) }
                .keyboardShortcut("t", modifiers: [.command, .option])
            Button("Trennlinie") { app?.activeTextView?.insertHorizontalRule() }
        }
        CommandMenu("Ansicht") {
            Button("Zweite Sektion ein-/ausblenden") { app?.toggleSplit() }
                .keyboardShortcut("\\", modifiers: .command)
                .disabled(app == nil)
            Button("Tab in andere Sektion verschieben") { app?.moveActiveTabToOtherPane() }
                .keyboardShortcut("\\", modifiers: [.command, .shift])
                .disabled(app == nil)
            Divider()
            Button("Ressourcen ein-/ausblenden") { app?.vault.showResources.toggle() }
                .keyboardShortcut("r", modifiers: [.command, .shift])
                .disabled(app == nil)
        }
    }
}

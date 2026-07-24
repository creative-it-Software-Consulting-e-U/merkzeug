import SwiftUI
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        AppState.shared.saveAll()
        return .terminateNow
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

@main
struct MyNotionApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @ObservedObject var app = AppState.shared

    var body: some Scene {
        Window("MyNotion", id: "main") {
            ContentView(app: app)
                .frame(minWidth: 900, minHeight: 560)
        }
        .commands {
            AppCommands(app: app)
        }
    }
}

struct AppCommands: Commands {
    @ObservedObject var app: AppState

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("Neue Notiz") { app.newNote() }
                .keyboardShortcut("n", modifiers: .command)
            Button("Neuer Ordner") { app.newFolder() }
                .keyboardShortcut("n", modifiers: [.command, .shift])
            Divider()
            Button("Vault öffnen…") { app.chooseVault() }
                .keyboardShortcut("o", modifiers: .command)
            Divider()
            Button("Tab schließen") { app.closeActiveTab() }
                .keyboardShortcut("w", modifiers: .command)
        }
        CommandGroup(replacing: .saveItem) {
            Button("Sichern") { app.saveActive() }
                .keyboardShortcut("s", modifiers: .command)
            Button("Alle sichern") { app.saveAll() }
                .keyboardShortcut("s", modifiers: [.command, .option])
        }
        CommandMenu("Format") {
            Button("Fett") { app.activeTextView?.toggleBold() }
                .keyboardShortcut("b", modifiers: .command)
            Button("Kursiv") { app.activeTextView?.toggleItalic() }
                .keyboardShortcut("i", modifiers: .command)
            Button("Durchgestrichen") { app.activeTextView?.toggleStrikethrough() }
                .keyboardShortcut("x", modifiers: [.command, .shift])
            Button("Inline-Code") { app.activeTextView?.toggleInlineCode() }
                .keyboardShortcut("e", modifiers: .command)
            Divider()
            Button("Text") { app.activeTextView?.setHeadingLevel(0) }
                .keyboardShortcut("0", modifiers: .command)
            Button("Überschrift 1") { app.activeTextView?.setHeadingLevel(1) }
                .keyboardShortcut("1", modifiers: .command)
            Button("Überschrift 2") { app.activeTextView?.setHeadingLevel(2) }
                .keyboardShortcut("2", modifiers: .command)
            Button("Überschrift 3") { app.activeTextView?.setHeadingLevel(3) }
                .keyboardShortcut("3", modifiers: .command)
            Divider()
            Button("Aufzählung") { app.activeTextView?.setList(ordered: false) }
                .keyboardShortcut("8", modifiers: [.command, .shift])
            Button("Nummerierte Liste") { app.activeTextView?.setList(ordered: true) }
                .keyboardShortcut("7", modifiers: [.command, .shift])
            Button("Zitat") { app.activeTextView?.toggleQuote() }
                .keyboardShortcut("9", modifiers: [.command, .shift])
            Button("Codeblock") { app.activeTextView?.toggleCodeBlock() }
                .keyboardShortcut("c", modifiers: [.command, .option])
            Divider()
            Button("Link…") { app.showLinkSheet() }
                .keyboardShortcut("k", modifiers: .command)
            Button("Tabelle einfügen") { app.activeTextView?.insertTable(rows: 3, cols: 3) }
                .keyboardShortcut("t", modifiers: [.command, .option])
            Button("Trennlinie") { app.activeTextView?.insertHorizontalRule() }
        }
        CommandMenu("Ansicht") {
            Button(app.isSplit ? "Zweite Sektion schließen" : "Zweite Sektion öffnen") {
                app.toggleSplit()
            }
            .keyboardShortcut("\\", modifiers: .command)
            Button("Tab in andere Sektion verschieben") {
                app.moveActiveTabToOtherPane()
            }
            .keyboardShortcut("\\", modifiers: [.command, .shift])
            Divider()
            Button(app.vault.showResources ? "Ressourcen ausblenden" : "Ressourcen einblenden") {
                app.vault.showResources.toggle()
            }
            .keyboardShortcut("r", modifiers: [.command, .shift])
        }
    }
}

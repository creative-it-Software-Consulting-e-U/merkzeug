import SwiftUI
import AppKit

struct ContentView: View {
    @ObservedObject var app: AppState
    @ObservedObject var vault: VaultStore

    init(app: AppState) {
        self.app = app
        self.vault = app.vault
    }

    var body: some View {
        NavigationSplitView {
            FileTreeView(app: app)
                .navigationSplitViewColumnWidth(min: 180, ideal: 240)
                .alert("Git", isPresented: Binding(
                    get: { app.infoMessage != nil },
                    set: { if !$0 { app.infoMessage = nil } }
                )) {
                    Button("OK", role: .cancel) {}
                } message: {
                    Text(app.infoMessage ?? "")
                }
        } detail: {
            detailView
        }
        .navigationTitle(vault.root != nil
                         ? (vault.vaultURL?.lastPathComponent ?? "Merkzeug")
                         : "Merkzeug")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    app.toggleSplit()
                } label: {
                    Image(systemName: app.isSplit
                          ? "rectangle"
                          : "rectangle.split.2x1")
                }
                .help(app.isSplit ? "Zweite Sektion schließen" : "Zweite Sektion öffnen")
            }
        }
        .sheet(item: $app.linkSheet) { state in
            LinkSheetView(app: app, state: state)
        }
        .sheet(item: $app.renameSheet) { state in
            RenameSheetView(app: app, state: state)
        }
        .alert("Fehler", isPresented: Binding(
            get: { app.errorMessage != nil },
            set: { if !$0 { app.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(app.errorMessage ?? "")
        }
        .onAppear {
            app.bootstrap()
        }
    }

    @ViewBuilder
    private var detailView: some View {
        if app.panes.count > 1 {
            HSplitView {
                PaneView(app: app, pane: app.panes[0])
                    .frame(minWidth: 320)
                PaneView(app: app, pane: app.panes[1])
                    .frame(minWidth: 320)
            }
        } else {
            PaneView(app: app, pane: app.panes[0])
        }
    }
}

/// Sheet zum Einfügen/Bearbeiten eines formatierten Links.
struct LinkSheetView: View {
    @ObservedObject var app: AppState
    let state: LinkSheetState

    @State private var text: String = ""
    @State private var url: String = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(state.url.isEmpty ? "Link einfügen" : "Link bearbeiten")
                .font(.headline)
            TextField("Angezeigter Text", text: $text)
                .textFieldStyle(.roundedBorder)
            TextField("Adresse (https://… oder relativer Pfad zu einer .md-Datei)", text: $url)
                .textFieldStyle(.roundedBorder)
            HStack {
                if !state.url.isEmpty {
                    Button("Link entfernen", role: .destructive) {
                        app.applyLinkSheet(state, text: text.isEmpty ? state.text : text, url: "")
                        dismiss()
                    }
                }
                Spacer()
                Button("Abbrechen") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Einfügen") {
                    app.applyLinkSheet(state, text: text, url: url)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(url.isEmpty && text.isEmpty)
            }
        }
        .padding(20)
        .frame(width: 440)
        .onAppear {
            text = state.text
            url = state.url
        }
    }
}

/// Sheet zum Umbenennen von Dateien/Ordnern.
struct RenameSheetView: View {
    @ObservedObject var app: AppState
    let state: RenameSheetState

    @State private var name: String = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Umbenennen")
                .font(.headline)
            TextField("Name", text: $name)
                .textFieldStyle(.roundedBorder)
            HStack {
                Spacer()
                Button("Abbrechen") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Umbenennen") {
                    app.rename(state.url, to: name)
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(20)
        .frame(width: 360)
        .onAppear {
            name = state.name
        }
    }
}

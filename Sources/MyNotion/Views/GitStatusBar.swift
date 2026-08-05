import SwiftUI

/// Zeigt unten in der Sidebar den Git-Zustand des Vaults (Branch, Änderungen,
/// ahead/behind). Ein Klick öffnet das Commit-&-Push-Popover.
struct GitStatusBar: View {
    @ObservedObject var app: AppState
    @ObservedObject var git: GitStatusModel

    @State private var showPopover = false
    @State private var message = ""

    var body: some View {
        Button {
            showPopover = true
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "arrow.triangle.branch")
                    .foregroundStyle(Color.accentColor)
                Text(git.status?.branch ?? "")
                    .lineLimit(1)
                Spacer(minLength: 0)
                if git.isBusy {
                    ProgressView()
                        .controlSize(.small)
                } else if let status = git.status {
                    if status.changedFiles > 0 {
                        Text("\(status.changedFiles)")
                            .foregroundStyle(.orange)
                        Image(systemName: "circle.fill")
                            .font(.system(size: 7))
                            .foregroundStyle(.orange)
                    }
                    if status.ahead > 0 {
                        // Lokale Commits, die noch nicht gepusht wurden
                        Text("\(status.ahead)↑")
                            .foregroundStyle(.orange)
                            .help("\(status.ahead) Commit(s) noch nicht gepusht")
                    }
                    if status.behind > 0 {
                        Text("\(status.behind)↓")
                            .foregroundStyle(.secondary)
                            .help("\(status.behind) neue(r) Commit(s) auf dem Server")
                    }
                    if status.isClean, status.ahead == 0, status.behind == 0 {
                        Image(systemName: "checkmark.circle")
                            .foregroundStyle(.green)
                    }
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
        .font(.callout)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .help("Git-Status – Klick für Commit & Push")
        .popover(isPresented: $showPopover, arrowEdge: .top) {
            popoverContent
        }
    }

    @ViewBuilder
    private var popoverContent: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let status = git.status {
                Label(status.branch, systemImage: "arrow.triangle.branch")
                    .font(.headline)
                Text(statusSummary(status))
                    .foregroundStyle(.secondary)
                if let upstream = status.upstream {
                    Text("Upstream: \(upstream)")
                        .foregroundStyle(.secondary)
                } else {
                    Text("Kein Upstream konfiguriert")
                        .foregroundStyle(.secondary)
                }
                if !status.changes.isEmpty {
                    Divider()
                    ScrollView {
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(status.changes) { change in
                                HStack(spacing: 6) {
                                    Text(change.kind.letter)
                                        .font(.system(.caption, design: .monospaced).bold())
                                        .foregroundStyle(color(for: change.kind))
                                        .frame(width: 14, alignment: .center)
                                    Text(change.path)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                        .help(change.path)
                                    Spacer(minLength: 0)
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 180)
                }
                Divider()
                TextField("Commit-Nachricht", text: $message)
                    .textFieldStyle(.roundedBorder)
                    .frame(minWidth: 280)
                HStack {
                    Button("Pull") {
                        app.pull()
                        showPopover = false
                    }
                    .disabled(git.isBusy || status.upstream == nil)
                    Spacer()
                    Button(pushOnly(status) ? "Push" : "Commit & Push") {
                        app.commitAndPush(message: message)
                        message = ""
                        showPopover = false
                    }
                    .keyboardShortcut(.defaultAction)
                    .disabled(commitDisabled(status))
                }
            }
        }
        .padding(16)
    }

    private func color(for kind: GitChangeKind) -> Color {
        switch kind {
        case .modified: return .orange
        case .added: return .green
        case .deleted, .conflicted: return .red
        case .renamed: return .blue
        case .untracked: return .secondary
        }
    }

    /// Nur pushen, wenn es keine lokalen Änderungen mehr gibt.
    private func pushOnly(_ status: GitRepoStatus) -> Bool {
        status.isClean && status.ahead > 0
    }

    private func commitDisabled(_ status: GitRepoStatus) -> Bool {
        if git.isBusy { return true }
        if status.isClean, status.ahead == 0 { return true }
        if !status.isClean, message.trimmingCharacters(in: .whitespaces).isEmpty { return true }
        return false
    }

    private func statusSummary(_ status: GitRepoStatus) -> String {
        var parts: [String] = []
        if status.changedFiles > 0 {
            parts.append(status.changedFiles == 1
                         ? "1 geänderte Datei"
                         : "\(status.changedFiles) geänderte Dateien")
        }
        if status.ahead > 0 {
            parts.append(status.ahead == 1
                         ? "1 Commit noch nicht gepusht"
                         : "\(status.ahead) Commits noch nicht gepusht")
        }
        if status.behind > 0 {
            parts.append(status.behind == 1
                         ? "1 neuer Commit auf dem Server"
                         : "\(status.behind) neue Commits auf dem Server")
        }
        return parts.isEmpty ? "Alles committet und gepusht" : parts.joined(separator: ", ")
    }
}

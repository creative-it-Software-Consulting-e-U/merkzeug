import Foundation

/// Art einer Änderung im Arbeitsverzeichnis.
enum GitChangeKind: Equatable {
    case modified, added, deleted, renamed, untracked, conflicted

    var letter: String {
        switch self {
        case .modified: return "M"
        case .added: return "A"
        case .deleted: return "D"
        case .renamed: return "R"
        case .untracked: return "?"
        case .conflicted: return "!"
        }
    }
}

/// Eine geänderte Datei (Pfad relativ zur Repo-Wurzel).
struct GitFileChange: Equatable, Identifiable {
    let path: String
    let kind: GitChangeKind
    var id: String { path }
}

/// Momentaufnahme des Git-Zustands eines Vaults.
struct GitRepoStatus: Equatable {
    var branch: String = ""
    var upstream: String?
    var ahead: Int = 0
    var behind: Int = 0
    /// Geänderte, neue, gelöschte oder konfliktbehaftete Dateien.
    var changes: [GitFileChange] = []

    var changedFiles: Int { changes.count }
    var isClean: Bool { changes.isEmpty }
}

/// Hält den Git-Status des Vaults aktuell und führt Commit & Push aus.
/// Alle git-Aufrufe laufen auf einer seriellen Hintergrund-Queue; die
/// veröffentlichten Properties werden nur auf dem Main-Thread geändert.
final class GitStatusModel: ObservableObject {

    /// nil, wenn der Vault kein Git-Repository ist (oder keiner geöffnet ist).
    @Published private(set) var status: GitRepoStatus?
    /// true, solange Commit/Push läuft.
    @Published private(set) var isBusy = false

    private var workingDirectory: URL?
    private let queue = DispatchQueue(label: "MyNotion.git", qos: .utility)
    private var refreshScheduled = false

    // MARK: - Status

    func vaultChanged(_ url: URL?) {
        workingDirectory = url
        status = nil
        refresh()
    }

    /// Liest den Status neu ein (entprellt, asynchron).
    func refresh() {
        guard !refreshScheduled else { return }
        refreshScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self else { return }
            self.refreshScheduled = false
            guard let dir = self.workingDirectory else { return }
            self.queue.async {
                let status = (try? Self.run(["status", "--porcelain=v2", "--branch"], in: dir))
                    .map(Self.parseStatus)
                DispatchQueue.main.async {
                    // Vault könnte inzwischen gewechselt worden sein
                    guard self.workingDirectory == dir else { return }
                    self.status = status
                }
            }
        }
    }

    /// Zerlegt die Ausgabe von `git status --porcelain=v2 --branch`.
    static func parseStatus(_ porcelain: String) -> GitRepoStatus {
        var status = GitRepoStatus()
        for line in porcelain.split(separator: "\n") {
            if line.hasPrefix("# branch.head ") {
                status.branch = String(line.dropFirst("# branch.head ".count))
            } else if line.hasPrefix("# branch.upstream ") {
                status.upstream = String(line.dropFirst("# branch.upstream ".count))
            } else if line.hasPrefix("# branch.ab ") {
                for part in line.dropFirst("# branch.ab ".count).split(separator: " ") {
                    if part.hasPrefix("+") { status.ahead = Int(part.dropFirst()) ?? 0 }
                    if part.hasPrefix("-") { status.behind = Int(part.dropFirst()) ?? 0 }
                }
            } else if line.hasPrefix("1 ") {
                // 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <pfad>
                let fields = line.split(separator: " ", maxSplits: 8, omittingEmptySubsequences: true)
                if fields.count == 9 {
                    status.changes.append(GitFileChange(path: String(fields[8]),
                                                        kind: kind(fromXY: fields[1])))
                }
            } else if line.hasPrefix("2 ") {
                // 2 <XY> … <X><score> <pfad>\t<alterPfad>
                let fields = line.split(separator: " ", maxSplits: 9, omittingEmptySubsequences: true)
                if fields.count == 10 {
                    let path = fields[9].split(separator: "\t").first.map(String.init) ?? String(fields[9])
                    status.changes.append(GitFileChange(path: path, kind: .renamed))
                }
            } else if line.hasPrefix("u ") {
                // u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <pfad>
                let fields = line.split(separator: " ", maxSplits: 10, omittingEmptySubsequences: true)
                if fields.count == 11 {
                    status.changes.append(GitFileChange(path: String(fields[10]), kind: .conflicted))
                }
            } else if line.hasPrefix("? ") {
                status.changes.append(GitFileChange(path: String(line.dropFirst(2)), kind: .untracked))
            }
        }
        return status
    }

    private static func kind(fromXY xy: Substring) -> GitChangeKind {
        if xy.contains("A") { return .added }
        if xy.contains("D") { return .deleted }
        return .modified
    }

    // MARK: - Commit & Push

    /// Stellt alle Änderungen bereit, committet und pusht. Liefert bei Erfolg
    /// optional einen Hinweistext (z. B. wenn kein Remote konfiguriert ist).
    /// Ungesicherte Editor-Inhalte muss der Aufrufer vorher speichern.
    func commitAndPush(message: String, completion: @escaping (Result<String?, Error>) -> Void) {
        guard let dir = workingDirectory, !isBusy else { return }
        isBusy = true
        queue.async {
            let result: Result<String?, Error>
            do {
                try Self.run(["add", "-A"], in: dir)
                let pending = try Self.run(["status", "--porcelain"], in: dir)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                if !pending.isEmpty {
                    try Self.run(["commit", "-m", message], in: dir)
                }
                let status = Self.parseStatus(
                    try Self.run(["status", "--porcelain=v2", "--branch"], in: dir))
                if pending.isEmpty, status.ahead == 0 {
                    result = .success("Keine Änderungen – nichts zu tun.")
                } else if status.upstream != nil {
                    try Self.run(["push"], in: dir)
                    result = .success(nil)
                } else if let remote = try Self.run(["remote"], in: dir)
                    .split(separator: "\n").first.map(String.init) {
                    try Self.run(["push", "-u", remote, "HEAD"], in: dir)
                    result = .success(nil)
                } else {
                    result = .success("Commit erstellt. Kein Remote konfiguriert, daher nicht gepusht.")
                }
            } catch {
                result = .failure(error)
            }
            DispatchQueue.main.async {
                self.isBusy = false
                self.refresh()
                completion(result)
            }
        }
    }

    // MARK: - Pull

    /// Holt Änderungen vom Remote (`git pull --no-edit`). Liefert bei Erfolg
    /// optional die git-Ausgabe als Hinweistext. Bei Merge-Konflikten schlägt
    /// der Befehl fehl; die Konfliktdateien erscheinen danach im Status.
    func pull(completion: @escaping (Result<String?, Error>) -> Void) {
        guard let dir = workingDirectory, !isBusy else { return }
        isBusy = true
        queue.async {
            let result: Result<String?, Error>
            do {
                let output = try Self.run(["pull", "--no-edit"], in: dir)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                result = .success(output.isEmpty ? nil : output)
            } catch {
                result = .failure(error)
            }
            DispatchQueue.main.async {
                self.isBusy = false
                self.refresh()
                completion(result)
            }
        }
    }

    // MARK: - Prozessaufruf

    @discardableResult
    private static func run(_ args: [String], in dir: URL) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = args
        process.currentDirectoryURL = dir
        var env = ProcessInfo.processInfo.environment
        // Niemals interaktiv nach Zugangsdaten fragen – lieber Fehler anzeigen.
        env["GIT_TERMINAL_PROMPT"] = "0"
        // Keinen Editor öffnen (z. B. für Merge-Commit-Nachrichten).
        env["GIT_EDITOR"] = "true"
        process.environment = env
        let stdout = Pipe()
        let stderr = Pipe()
        process.standardOutput = stdout
        process.standardError = stderr
        try process.run()
        let outData = stdout.fileHandleForReading.readDataToEndOfFile()
        let errData = stderr.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            let stderrText = String(data: errData, encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            throw NSError(domain: "MyNotion.Git", code: Int(process.terminationStatus), userInfo: [
                NSLocalizedDescriptionKey: stderrText.isEmpty
                    ? "git \(args.joined(separator: " ")) ist fehlgeschlagen."
                    : stderrText,
            ])
        }
        return String(data: outData, encoding: .utf8) ?? ""
    }
}

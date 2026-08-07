import Foundation
import AppKit

/// Verwaltet den Ressourcen-Ordner ("<Name>.assets") neben jeder Markdown-Datei.
enum AssetManager {

    static let assetsExtension = "assets"

    static func assetsDirectory(for mdURL: URL) -> URL {
        mdURL.deletingPathExtension().appendingPathExtension(assetsExtension)
    }

    static func isAssetsDirectory(_ url: URL) -> Bool {
        url.pathExtension == assetsExtension
    }

    /// Relativer (prozent-kodierter) Pfad für die Verwendung im Markdown.
    private static func relativePath(dir: URL, fileName: String) -> String {
        let raw = "\(dir.lastPathComponent)/\(fileName)"
        return raw.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? raw
    }

    private static func uniqueURL(in dir: URL, base: String, ext: String) -> URL {
        let fm = FileManager.default
        var candidate = dir.appendingPathComponent("\(base).\(ext)")
        var counter = 2
        while fm.fileExists(atPath: candidate.path) {
            candidate = dir.appendingPathComponent("\(base)-\(counter).\(ext)")
            counter += 1
        }
        return candidate
    }

    /// Speichert rohe Bilddaten (z. B. aus der Zwischenablage) und liefert den relativen Pfad.
    static func saveImageData(_ data: Data, preferredName: String? = nil,
                              fileExtension: String, for mdURL: URL) throws -> String {
        let dir = assetsDirectory(for: mdURL)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let base = (preferredName?.isEmpty == false ? preferredName! : "bild")
        let target = uniqueURL(in: dir, base: sanitize(base), ext: fileExtension)
        try data.write(to: target)
        return relativePath(dir: dir, fileName: target.lastPathComponent)
    }

    /// Kopiert eine Bilddatei in den Ressourcen-Ordner und liefert den relativen Pfad.
    static func importImageFile(_ source: URL, for mdURL: URL) throws -> String {
        let dir = assetsDirectory(for: mdURL)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let base = source.deletingPathExtension().lastPathComponent
        let ext = source.pathExtension.isEmpty ? "png" : source.pathExtension
        let target = uniqueURL(in: dir, base: sanitize(base), ext: ext)
        try FileManager.default.copyItem(at: source, to: target)
        return relativePath(dir: dir, fileName: target.lastPathComponent)
    }

    private static func sanitize(_ name: String) -> String {
        let invalid = CharacterSet(charactersIn: "/\\:|\"<>?*")
        return String(name.unicodeScalars.map { invalid.contains($0) ? "-" : Character($0) })
    }

    /// Bekannte Bild-Dateiendungen.
    static let imageExtensions: Set<String> = ["png", "jpg", "jpeg", "gif", "tiff", "tif", "bmp", "heic", "webp", "svg"]

    static func isImageFile(_ url: URL) -> Bool {
        imageExtensions.contains(url.pathExtension.lowercased())
    }
}

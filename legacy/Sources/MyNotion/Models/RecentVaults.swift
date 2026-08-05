import Foundation

/// Historie der zuletzt geöffneten Vaults (app-weit, persistiert in
/// UserDefaults). Der neueste Eintrag steht vorne.
final class RecentVaults: ObservableObject {

    static let shared = RecentVaults()
    static let maxCount = 10

    @Published private(set) var paths: [String]

    private let defaults: UserDefaults
    private let key = "recentVaults"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.paths = defaults.stringArray(forKey: key) ?? []
    }

    /// Trägt einen Vault (neu) an erster Stelle ein.
    func noteOpened(_ url: URL) {
        var list = paths.filter { $0 != url.path }
        list.insert(url.path, at: 0)
        if list.count > Self.maxCount {
            list = Array(list.prefix(Self.maxCount))
        }
        paths = list
        defaults.set(list, forKey: key)
    }

    func clear() {
        paths = []
        defaults.removeObject(forKey: key)
    }
}

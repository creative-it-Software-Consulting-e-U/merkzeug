import Capacitor
import UIKit

@objc(WorkingCopyPlugin)
public class WorkingCopyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WorkingCopyPlugin"
    public let jsName = "MerkzeugWorkingCopy"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "run", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "operation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismiss", returnType: CAPPluginReturnPromise)
    ]
    private static let pendingKey = "merkzeug.working-copy.operation"
    public override func load() {
        if var operation = UserDefaults.standard.dictionary(forKey: Self.pendingKey), operation["status"] as? String == "pending" {
            operation["status"] = "interrupted"
            UserDefaults.standard.set(operation, forKey: Self.pendingKey)
        }
    }
    static func callback(_ url: URL) {
        guard url.scheme == "merkzeug", url.host == "working-copy",
              let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let nonce = parts.queryItems?.first(where: { $0.name == "state" })?.value,
              var operation = UserDefaults.standard.dictionary(forKey: pendingKey),
              operation["state"] as? String == nonce,
              ["pending", "interrupted"].contains(operation["status"] as? String ?? "") else { return }
        let status = String(url.path.dropFirst())
        guard ["success", "cancel", "error"].contains(status) else { return }
        operation["status"] = status
        UserDefaults.standard.set(operation, forKey: pendingKey)
    }
    @objc func status(_ call: CAPPluginCall) {
        guard let vault = call.getString("vault") else { call.reject("No vault selected"); return }
        do {
            let raw = try DeviceSecrets.read("working-copy:" + vault)
            let data = raw?.data(using: .utf8)
            let config = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: String] }
            DispatchQueue.main.async { call.resolve(["available": UIApplication.shared.canOpenURL(URL(string: "working-copy://")!), "repo": config?["repo"] ?? ""]) }
        } catch { call.reject("Could not read Working Copy configuration") }
    }
    @objc func configure(_ call: CAPPluginCall) {
        guard let vault = call.getString("vault"), let repo = call.getString("repo"), let key = call.getString("key"),
              !repo.isEmpty, !key.isEmpty, !repo.contains("*"), repo != "$current" else { call.reject("Enter an exact repository name or remote URL and callback key"); return }
        do {
            let data = try JSONSerialization.data(withJSONObject: ["repo": repo, "key": key])
            try DeviceSecrets.write("working-copy:" + vault, String(decoding: data, as: UTF8.self))
            call.resolve()
        } catch { call.reject("Could not save Working Copy configuration") }
    }
    @objc func operation(_ call: CAPPluginCall) { call.resolve(UserDefaults.standard.dictionary(forKey: Self.pendingKey) ?? [:]) }
    @objc func dismiss(_ call: CAPPluginCall) { UserDefaults.standard.removeObject(forKey: Self.pendingKey); call.resolve() }
    @objc func run(_ call: CAPPluginCall) {
        guard let vault = call.getString("vault"), let action = call.getString("action"), ["pull", "commit", "push"].contains(action) else { call.reject("Invalid Working Copy action"); return }
        guard UserDefaults.standard.dictionary(forKey: Self.pendingKey) == nil else { call.reject("Review the previous operation before starting another"); return }
        do {
            guard let raw = try DeviceSecrets.read("working-copy:" + vault), let data = raw.data(using: .utf8),
                  let config = try JSONSerialization.jsonObject(with: data) as? [String: String], let repo = config["repo"], let key = config["key"] else { call.reject("Configure Working Copy for this vault first"); return }
            let nonce = UUID().uuidString
            var items = [URLQueryItem(name: "repo", value: repo), URLQueryItem(name: "key", value: key)]
            for status in ["success", "cancel", "error"] { items.append(URLQueryItem(name: "x-" + status, value: "merkzeug://working-copy/" + status + "?state=" + nonce)) }
            if action == "commit" {
                // Let Working Copy present the change list and commit message; never commit unseen files automatically.
                items += [URLQueryItem(name: "path", value: ""), URLQueryItem(name: "limit", value: "99999")]
            }
            var parts = URLComponents()
            parts.scheme = "working-copy"; parts.host = "x-callback-url"; parts.path = "/" + action + "/"; parts.queryItems = items
            guard let url = parts.url else { call.reject("Invalid Working Copy configuration"); return }
            UserDefaults.standard.set(["state": nonce, "status": "pending", "action": action, "vault": vault, "started": Date().timeIntervalSince1970], forKey: Self.pendingKey)
            DispatchQueue.main.async {
                UIApplication.shared.open(url, options: [:]) { opened in
                    if opened { call.resolve() }
                    else { UserDefaults.standard.removeObject(forKey: Self.pendingKey); call.reject("Working Copy could not be opened") }
                }
            }
        } catch { call.reject("Could not read Working Copy configuration") }
    }
}

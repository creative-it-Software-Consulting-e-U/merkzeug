import Capacitor
import EventKit
import Security

/// Read-only calendar source. Permission is requested only after opening meeting notes.
@objc(CalendarPlugin)
public class CalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CalendarPlugin"
    public let jsName = "MerkzeugCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sourcesLoad", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sourcesSave", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fetch", returnType: CAPPluginReturnPromise)
    ]
    private let store = EKEventStore()
    private let queue = DispatchQueue(label: "com.creative-it.merkzeug.calendar")

    @objc func sourcesLoad(_ call: CAPPluginCall) {
        do { call.resolve(["value": try DeviceSecrets.read("calendar-sources") ?? NSNull()]) }
        catch { call.reject("Could not read secure calendar storage") }
    }
    @objc func sourcesSave(_ call: CAPPluginCall) {
        guard let value = call.getString("value") else { call.reject("Missing calendar sources"); return }
        do { try DeviceSecrets.write("calendar-sources", value); call.resolve() }
        catch { call.reject("Could not save secure calendar storage") }
    }
    @objc func fetch(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw), url.scheme == "https", url.user == nil, url.password == nil else { call.reject("Use an HTTPS subscription URL"); return }
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard error == nil, let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                  let data = data, data.count <= 2_000_000, let text = String(data: data, encoding: .utf8) else {
                call.reject("Calendar download failed. Check the subscription URL and network connection."); return
            }
            call.resolve(["text": text])
        }.resume()
    }

    @objc func list(_ call: CAPPluginCall) {
        guard let from = call.getDouble("fromMs"), let to = call.getDouble("toMs"),
              from.isFinite, to.isFinite, to > from, to - from <= 183 * 86_400_000 else {
            call.reject("Invalid calendar date range"); return
        }
        let fetch: (Bool, Error?) -> Void = { granted, error in
            if let error = error { call.resolve(["ok": false, "error": "failed", "message": error.localizedDescription, "events": []]); return }
            guard granted else { call.resolve(["ok": false, "error": "denied", "events": []]); return }
            self.queue.async {
                let start = Date(timeIntervalSince1970: from / 1000)
                let end = Date(timeIntervalSince1970: to / 1000)
                let predicate = self.store.predicateForEvents(withStart: start, end: end, calendars: nil)
                let format = ISO8601DateFormatter()
                let events = self.store.events(matching: predicate).filter { $0.status != .canceled }.sorted { $0.startDate < $1.startDate }.map { event -> [String: Any] in
                    var result: [String: Any] = [
                        "id": event.calendarItemIdentifier, "title": event.title ?? "",
                        "start": format.string(from: event.startDate), "end": format.string(from: event.endDate),
                        "allDay": event.isAllDay, "calendar": event.calendar.title,
                        "attendees": (event.attendees ?? []).map(self.person)
                    ]
                    if let location = event.location { result["location"] = location }
                    if let organizer = event.organizer { result["organizer"] = self.person(organizer) }
                    if let url = event.url, ["https", "http"].contains(url.scheme?.lowercased() ?? "") { result["meetingUrl"] = url.absoluteString }
                    return result
                }
                call.resolve(["ok": true, "events": events])
            }
        }
        DispatchQueue.main.async {
            if #available(iOS 17.0, *) { self.store.requestFullAccessToEvents(completion: fetch) }
            else { self.store.requestAccess(to: .event, completion: fetch) }
        }
    }
    private func person(_ participant: EKParticipant) -> [String: Any] {
        var result: [String: Any] = ["optional": participant.participantRole == .optional]
        if let name = participant.name { result["name"] = name }
        if participant.url.scheme == "mailto" { result["email"] = String(participant.url.absoluteString.dropFirst(7)).removingPercentEncoding ?? "" }
        return result
    }
}

/// Device-only keychain items are not synchronized to other devices or written into vaults.
enum DeviceSecrets {
    static func read(_ key: String) throws -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.creative-it.merkzeug", kSecAttrAccount as String: key, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
        return value
    }
    static func write(_ key: String, _ value: String) throws {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.creative-it.merkzeug", kSecAttrAccount as String: key]
        let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound { status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil) }
        guard status == errSecSuccess else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
    }
}

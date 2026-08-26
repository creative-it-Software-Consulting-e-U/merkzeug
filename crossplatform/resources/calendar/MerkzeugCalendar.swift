// Merkzeug-Kalender-Helfer (macOS): liest Termine über EventKit und gibt sie
// als JSON auf stdout aus. Wird vom Electron-Main-Prozess aufgerufen.
//
// Aufruf:   merkzeug-calendar <von-epoch-sekunden> <bis-epoch-sekunden>
// Ausgabe:  {"events":[…]}  oder  {"error":"denied"|"usage"}
//
// Der Kalender-Zugriff wird beim ersten Aufruf vom System erfragt; die
// Berechtigung hängt am aufrufenden Programm (der Merkzeug-App).

import EventKit
import Foundation

struct Person: Codable {
  let name: String?
  let email: String?
  let optional: Bool?
}

struct Event: Codable {
  let id: String
  let title: String
  let start: String
  let end: String
  let allDay: Bool
  let location: String?
  let calendar: String?
  let organizer: Person?
  let attendees: [Person]
  let url: String?
  let notes: String?
}

struct Output: Codable {
  let events: [Event]
}

struct ErrorOutput: Codable {
  let error: String
}

func emit<T: Codable>(_ value: T) {
  let encoder = JSONEncoder()
  if let data = try? encoder.encode(value) {
    FileHandle.standardOutput.write(data)
  }
}

func email(from participant: EKParticipant) -> String? {
  let raw = participant.url.absoluteString
  guard raw.lowercased().hasPrefix("mailto:") else { return nil }
  let address = String(raw.dropFirst("mailto:".count))
  return address.isEmpty ? nil : address.removingPercentEncoding ?? address
}

func person(from participant: EKParticipant) -> Person {
  Person(
    name: participant.name,
    email: email(from: participant),
    optional: participant.participantRole == .optional ? true : nil
  )
}

guard CommandLine.arguments.count == 3,
  let fromEpoch = Double(CommandLine.arguments[1]),
  let toEpoch = Double(CommandLine.arguments[2])
else {
  emit(ErrorOutput(error: "usage"))
  exit(2)
}

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)
var granted = false
if #available(macOS 14.0, *) {
  store.requestFullAccessToEvents { ok, _ in
    granted = ok
    semaphore.signal()
  }
} else {
  store.requestAccess(to: .event) { ok, _ in
    granted = ok
    semaphore.signal()
  }
}
semaphore.wait()

guard granted else {
  emit(ErrorOutput(error: "denied"))
  exit(1)
}

let from = Date(timeIntervalSince1970: fromEpoch)
let to = Date(timeIntervalSince1970: toEpoch)
let predicate = store.predicateForEvents(withStart: from, end: to, calendars: nil)
let matches = store.events(matching: predicate)

let iso = ISO8601DateFormatter()
iso.formatOptions = [.withInternetDateTime]

let events: [Event] = matches
  .sorted { $0.startDate < $1.startDate }
  .compactMap { event in
    guard let start = event.startDate, let end = event.endDate else { return nil }
    // Räume/Ressourcen sind keine Teilnehmer
    let attendees = (event.attendees ?? [])
      .filter { $0.participantType == .person || $0.participantType == .group }
      .map(person(from:))
    // Notizen nur gekürzt mitgeben – daraus wird der Besprechungs-Link extrahiert
    let notes = event.notes.map { String($0.prefix(4000)) }
    return Event(
      id: event.eventIdentifier ?? "\(event.calendarItemIdentifier):\(start.timeIntervalSince1970)",
      title: event.title ?? "(ohne Titel)",
      start: iso.string(from: start),
      end: iso.string(from: end),
      allDay: event.isAllDay,
      location: event.location,
      calendar: event.calendar?.title,
      organizer: event.organizer.map(person(from:)),
      attendees: attendees,
      url: event.url?.absoluteString,
      notes: notes
    )
  }

emit(Output(events: events))

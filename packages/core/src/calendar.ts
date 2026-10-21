/** Person in einem Kalendertermin (Organisator/Teilnehmer) */
export interface CalendarPerson {
  name?: string
  email?: string
  /** true bei optionaler Teilnahme */
  optional?: boolean
}

/** Termin aus einem lokal eingebundenen Kalender */
export interface CalendarEvent {
  /** Stable occurrence identity, including recurrence exceptions. */
  identity?: string
  id: string
  title: string
  /** ISO-8601 */
  start: string
  /** ISO-8601 */
  end: string
  allDay: boolean
  location?: string
  /** Name des Kalenders, aus dem der Termin stammt */
  calendar?: string
  organizer?: CalendarPerson
  attendees: CalendarPerson[]
  /** Teilnehmerzahl, falls die Liste (noch) nicht geladen ist (Windows: erst beim Anklicken) */
  attendeeCount?: number
  /** erkannter Besprechungs-Link (Teams/Zoom/Meet/Webex) */
  meetingUrl?: string
}

export interface CalendarResult {
  ok: boolean
  /** denied = Zugriff verweigert, unsupported = Plattform ohne Anbindung */
  error?: 'denied' | 'unsupported' | 'failed'
  message?: string
  events: CalendarEvent[]
}

/** Anbindung an den Systemkalender, wie sie die Einstellungen anzeigen */
export interface CalendarAccess {
  /** macos = Kalender-App über EventKit, outlook = klassisches Outlook (Windows), none = keine Anbindung */
  system: 'macos' | 'outlook' | 'none'
  /** Nur macOS: Berechtigung; failed = Helfer nicht ausführbar */
  state?: 'granted' | 'notDetermined' | 'denied' | 'restricted' | 'failed'
  /** Nur macOS bei erteiltem Zugriff: Konten der Kalender-App (iCloud, Exchange, …) */
  accounts?: string[]
  message?: string
}

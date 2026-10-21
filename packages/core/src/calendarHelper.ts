/**
 * Gemeinsame Auswertung der Kalender-Helfer (macOS EventKit, Windows Outlook):
 * Desktop und IntelliJ lesen dasselbe JSON ({"events":[…]} bzw. {"error":…}).
 */
import type { CalendarAccess, CalendarEvent, CalendarPerson, CalendarResult } from './calendar'

/** Rohes Termin-Format der Kalender-Helfer */
export interface RawEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  calendar?: string
  organizer?: CalendarPerson
  attendees?: CalendarPerson[]
  attendeeCount?: number
  url?: string
  notes?: string
}

/** Erkennt Besprechungs-Links (Teams, Zoom, Meet, Webex) in URL/Ort/Notizen. */
function extractMeetingUrl(raw: RawEvent): string | undefined {
  const pattern =
    /https:\/\/(?:[\w.-]*teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"')\]]+|[\w.-]*zoom\.us\/[jw]\/[^\s<>"')\]]+|meet\.google\.com\/[a-z-]+|[\w.-]*webex\.com\/(?:meet|join)\/[^\s<>"')\]]+)/i
  for (const text of [raw.url, raw.location, raw.notes]) {
    const match = text?.match(pattern)
    if (match) return match[0]
  }
  return undefined
}

export function toEvent(raw: RawEvent): CalendarEvent {
  return {
    id: raw.id,
    title: raw.title,
    start: raw.start,
    end: raw.end,
    allDay: raw.allDay,
    location: raw.location,
    calendar: raw.calendar,
    organizer: raw.organizer,
    attendees: raw.attendees ?? [],
    attendeeCount: raw.attendeeCount,
    meetingUrl: extractMeetingUrl(raw)
  }
}

export function parseHelperOutput(stdout: string): CalendarResult {
  const parsed = JSON.parse(stdout) as { events?: RawEvent[]; error?: string; message?: string }
  if (parsed.error === 'denied' || parsed.error === 'unsupported') {
    return { ok: false, error: parsed.error, message: parsed.message, events: [] }
  }
  if (!parsed.events) {
    return { ok: false, error: 'failed', message: parsed.message ?? parsed.error, events: [] }
  }
  return { ok: true, events: parsed.events.map(toEvent) }
}

/** Antwort von `merkzeug-calendar status|request` (macOS) */
export function parseAccessOutput(stdout: string): CalendarAccess {
  const parsed = JSON.parse(stdout) as { access?: string; accounts?: unknown; error?: string; message?: string }
  const states = ['granted', 'notDetermined', 'denied', 'restricted'] as const
  const state = states.find(value => value === parsed.access)
  if (!state) return { system: 'macos', state: 'failed', message: parsed.message ?? parsed.error }
  const accounts = Array.isArray(parsed.accounts) ? parsed.accounts.filter((a): a is string => typeof a === 'string') : []
  return { system: 'macos', state, accounts }
}

/**
 * Kalender-Anbindung für „Neue Meeting-Notiz“: liest Termine aus lokal
 * konfigurierten Kalendern – ohne Cloud-APIs.
 *
 * macOS: über den mitgelieferten EventKit-Helfer (resources/calendar), der
 * alle in der Kalender-App eingebundenen Konten sieht (iCloud, Exchange,
 * Google, …). Windows/Linux folgen später (Outlook-COM bzw. ICS).
 *
 * Debug: MERKZEUG_CALENDAR_FIXTURE=/pfad.json liefert Termine aus einer
 * JSON-Datei ({"events":[…]} wie der Helfer) statt vom System.
 */
import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CalendarEvent, CalendarPerson, CalendarResult } from '../shared/types'

/** Rohes Termin-Format des EventKit-Helfers */
interface RawEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  calendar?: string
  organizer?: CalendarPerson
  attendees?: CalendarPerson[]
  url?: string
  notes?: string
}

const HELPER_DIR_DEV = join(__dirname, '../../resources/calendar')
const HELPER_NAME = 'merkzeug-calendar'

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

function toEvent(raw: RawEvent): CalendarEvent {
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
    meetingUrl: extractMeetingUrl(raw)
  }
}

function parseHelperOutput(stdout: string): CalendarResult {
  const parsed = JSON.parse(stdout) as { events?: RawEvent[]; error?: string }
  if (parsed.error === 'denied') {
    return { ok: false, error: 'denied', events: [] }
  }
  if (!parsed.events) {
    return { ok: false, error: 'failed', message: parsed.error, events: [] }
  }
  return { ok: true, events: parsed.events.map(toEvent) }
}

/**
 * Liefert im Entwicklungsmodus den Pfad zum Helfer und kompiliert ihn bei
 * Bedarf aus dem Swift-Quelltext (swiftc gehört zu Xcode/CLT).
 */
async function devHelperPath(): Promise<string> {
  const source = join(HELPER_DIR_DEV, 'MerkzeugCalendar.swift')
  const binary = join(HELPER_DIR_DEV, HELPER_NAME)
  const stale =
    !existsSync(binary) || statSync(binary).mtimeMs < statSync(source).mtimeMs
  if (stale) {
    await new Promise<void>((resolve, reject) => {
      execFile('swiftc', ['-O', source, '-o', binary], (err, _out, stderr) =>
        err ? reject(new Error(stderr || String(err))) : resolve()
      )
    })
  }
  return binary
}

async function listMac(fromMs: number, toMs: number): Promise<CalendarResult> {
  const helper = app.isPackaged
    ? join(process.resourcesPath, 'calendar', HELPER_NAME)
    : await devHelperPath()
  if (!existsSync(helper)) {
    return { ok: false, error: 'failed', message: 'Kalender-Helfer fehlt.', events: [] }
  }
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      helper,
      [String(Math.floor(fromMs / 1000)), String(Math.ceil(toMs / 1000))],
      // großzügiges Timeout: der erste Aufruf wartet auf den Berechtigungsdialog
      { timeout: 180_000, maxBuffer: 32 * 1024 * 1024 },
      (err, out) => (err && !out ? reject(err) : resolve(out))
    )
  })
  return parseHelperOutput(stdout)
}

async function listFixture(path: string, fromMs: number, toMs: number): Promise<CalendarResult> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as { events: RawEvent[] }
  const events = parsed.events
    .map(toEvent)
    .filter((e) => Date.parse(e.end) >= fromMs && Date.parse(e.start) <= toMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return { ok: true, events }
}

/** Termine im Zeitraum [fromMs, toMs] (Unix-Millisekunden), aufsteigend sortiert. */
export async function listCalendarEvents(fromMs: number, toMs: number): Promise<CalendarResult> {
  try {
    const fixture = process.env.MERKZEUG_CALENDAR_FIXTURE
    if (fixture) return await listFixture(fixture, fromMs, toMs)
    if (process.platform === 'darwin') return await listMac(fromMs, toMs)
    return { ok: false, error: 'unsupported', events: [] }
  } catch (err) {
    return { ok: false, error: 'failed', message: String(err), events: [] }
  }
}

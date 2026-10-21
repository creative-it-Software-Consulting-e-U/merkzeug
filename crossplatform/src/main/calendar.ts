import { t as translate } from '@merkzeug/core/i18n'
/**
 * Kalender-Anbindung für „Neue Meeting-Notiz“: liest Termine aus lokal
 * konfigurierten Kalendern – ohne Cloud-APIs.
 *
 * macOS: über den mitgelieferten EventKit-Helfer (resources/calendar), der
 * alle in der Kalender-App eingebundenen Konten sieht (iCloud, Exchange,
 * Google, …).
 * Windows: über das PowerShell-Skript merkzeug-calendar.ps1, das das
 * klassische Outlook per COM abfragt (alle dort eingerichteten Konten).
 * Das New Outlook hat keine COM-Schnittstelle → „unsupported“. Linux folgt (ICS).
 *
 * Debug: MERKZEUG_CALENDAR_FIXTURE=/pfad.json liefert Termine aus einer
 * JSON-Datei ({"events":[…]} wie der Helfer) statt vom System.
 */
import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseAccessOutput, parseHelperOutput, toEvent, type RawEvent } from '@merkzeug/core/calendarHelper'
import type { CalendarAccess, CalendarEvent, CalendarResult } from '../shared/types'

const HELPER_DIR_DEV = join(__dirname, '../../resources/calendar')
const HELPER_NAME = 'merkzeug-calendar'
const HELPER_PS1 = 'merkzeug-calendar.ps1'

const helperDir = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'calendar') : HELPER_DIR_DEV

/** Epoch-Sekunden-Argumente für die Helfer */
const epochArgs = (fromMs: number, toMs: number): string[] => [
  String(Math.floor(fromMs / 1000)),
  String(Math.ceil(toMs / 1000))
]

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

const macHelper = async (): Promise<string> =>
  app.isPackaged ? join(helperDir(), HELPER_NAME) : await devHelperPath()

async function listMac(fromMs: number, toMs: number): Promise<CalendarResult> {
  const helper = await macHelper()
  if (!existsSync(helper)) {
    return { ok: false, error: 'failed', message: translate("Calendar helper is missing."), events: [] }
  }
  return parseHelperOutput(await run(helper, epochArgs(fromMs, toMs)))
}

/** Windows PowerShell 5.1 – auf jedem Windows vorhanden */
function powershellPath(): string {
  return join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  )
}

/**
 * Windows: klassisches Outlook per COM über das PowerShell-Skript. Windows
 * PowerShell 5.1 ist auf jedem Windows vorhanden; -ExecutionPolicy Bypass gilt
 * nur für diesen Prozess und umgeht keine Gruppenrichtlinie.
 */
async function runWindowsHelper(args: string[]): Promise<CalendarResult> {
  const script = join(helperDir(), HELPER_PS1)
  if (!existsSync(script)) {
    return { ok: false, error: 'failed', message: translate("Calendar helper is missing."), events: [] }
  }
  const stdout = await run(powershellPath(), [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    ...args
  ])
  // Windows PowerShell gibt notfalls eine BOM aus
  return parseHelperOutput(stdout.replace(/^\uFEFF/, ''))
}

const listWindows = (fromMs: number, toMs: number): Promise<CalendarResult> =>
  runWindowsHelper(['list', ...epochArgs(fromMs, toMs)])

/** Führt einen Helfer aus und liefert stdout (auch bei Exit-Code ≠ 0, falls Ausgabe vorliegt). */
function run(file: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      // großzügiges Timeout: der erste Aufruf wartet auf den Berechtigungsdialog
      // (macOS) bzw. auf den Start von Outlook (Windows)
      { timeout: 180_000, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (err, out, stderr) => {
        if (err && !out.trim()) reject(new Error(stderr?.trim() || String(err)))
        else resolve(out)
      }
    )
  })
}

async function listFixture(path: string, fromMs: number, toMs: number): Promise<CalendarResult> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as { events: RawEvent[] }
  const events = parsed.events
    .map(toEvent)
    .filter((e) => Date.parse(e.end) >= fromMs && Date.parse(e.start) <= toMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return { ok: true, events }
}

/**
 * Vollständige Daten eines Termins aus der Liste (Teilnehmer, Meeting-Link).
 * Unter Windows liefert die Liste aus Geschwindigkeitsgründen nur die
 * Teilnehmerzahl; die Auflösung passiert hier, beim Anklicken. macOS und die
 * Fixture liefern bereits alles. Schlägt die Auflösung fehl, bleibt der
 * Listeneintrag (Notiz ohne Teilnehmerliste ist besser als keine).
 */
export async function calendarEventDetail(event: CalendarEvent): Promise<CalendarEvent> {
  if (event.identity || process.env.MERKZEUG_CALENDAR_FIXTURE || process.platform !== 'win32') return event
  try {
    const result = await runWindowsHelper(['detail', event.id, event.start])
    const detail = result.ok ? result.events[0] : undefined
    if (!detail) return event
    return {
      ...event,
      attendees: detail.attendees,
      attendeeCount: detail.attendees.length,
      meetingUrl: detail.meetingUrl ?? event.meetingUrl
    }
  } catch {
    return event
  }
}

/** Termine im Zeitraum [fromMs, toMs] (Unix-Millisekunden), aufsteigend sortiert. */
export async function listCalendarEvents(fromMs: number, toMs: number): Promise<CalendarResult> {
  try {
    const fixture = process.env.MERKZEUG_CALENDAR_FIXTURE
    if (fixture) return await listFixture(fixture, fromMs, toMs)
    if (process.platform === 'darwin') return await listMac(fromMs, toMs)
    if (process.platform === 'win32') return await listWindows(fromMs, toMs)
    return { ok: false, error: 'unsupported', events: [] }
  } catch (err) {
    return { ok: false, error: 'failed', message: String(err), events: [] }
  }
}

/**
 * Systemkalender für die Einstellungen. macOS liest die Berechtigung ohne
 * Rückfrage; mit request zeigt das System bei Bedarf seinen Zugriffsdialog.
 */
export async function calendarAccess(request = false): Promise<CalendarAccess> {
  if (process.platform === 'win32') return { system: 'outlook' }
  if (process.platform !== 'darwin') return { system: 'none' }
  try {
    const helper = await macHelper()
    if (!existsSync(helper)) return { system: 'macos', state: 'failed', message: translate("Calendar helper is missing.") }
    return parseAccessOutput(await run(helper, [request ? 'request' : 'status']))
  } catch (err) {
    return { system: 'macos', state: 'failed', message: String(err) }
  }
}

/** Öffnet Systemeinstellungen → Datenschutz & Sicherheit → Kalender. */
export const openCalendarPrivacy = (): Promise<void> =>
  shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars')

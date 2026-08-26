/** Erzeugt Dateiname und Inhalt einer Meeting-Notiz aus einem Kalendertermin. */

import type { CalendarEvent, CalendarPerson } from '../../../shared/types'
import { slugifyTitle } from './autoName'

const pad = (n: number): string => String(n).padStart(2, '0')

/** Lokales Datum als YYYY-MM-DD */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Lokale Uhrzeit als HH:MM */
export function localTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Zeit-Beschriftung eines Termins: "10:00–11:00" bzw. "ganztägig" */
export function meetingTimeLabel(ev: CalendarEvent): string {
  if (ev.allDay) return 'ganztägig'
  return `${localTime(new Date(ev.start))}–${localTime(new Date(ev.end))}`
}

const bodyDayFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

/** Datum/Zeit-Zeile für den Notiz-Text: "Mi., 26.08.2026 · 14:49–15:49" */
export function meetingDateLine(ev: CalendarEvent): string {
  const start = new Date(ev.start)
  if (ev.allDay) {
    // Ganztägige Termine enden um Mitternacht nach dem letzten Tag
    const lastDay = new Date(Date.parse(ev.end) - 1)
    if (localDate(lastDay) !== localDate(start)) {
      return `${bodyDayFormat.format(start)} – ${bodyDayFormat.format(lastDay)} · ganztägig`
    }
    return `${bodyDayFormat.format(start)} · ganztägig`
  }
  return `${bodyDayFormat.format(start)} · ${meetingTimeLabel(ev)}`
}

/** "Name <mail>", nur Name oder nur Mail – je nachdem, was vorhanden ist */
function personLabel(p: CalendarPerson): string | null {
  if (p.name && p.email && p.name !== p.email) return `${p.name} <${p.email}>`
  return p.name ?? p.email ?? null
}

function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Dateiname (ohne .md): "2026-08-26-titel-als-slug" */
export function meetingNoteFileBase(ev: CalendarEvent): string {
  const date = localDate(new Date(ev.start))
  const slug = slugifyTitle(ev.title)
  return slug.startsWith(date) ? slug : `${date}-${slug}`.replace(/-+$/, '')
}

/** Markdown-Inhalt: Frontmatter mit den Termin-Daten + Notiz-Gerüst */
export function meetingNoteContent(ev: CalendarEvent): string {
  const lines: string[] = ['---', `title: ${yamlQuote(ev.title)}`]
  lines.push(`date: ${localDate(new Date(ev.start))}`)
  lines.push(`time: ${yamlQuote(meetingTimeLabel(ev))}`)
  if (ev.location) lines.push(`location: ${yamlQuote(ev.location)}`)
  const organizer = ev.organizer && personLabel(ev.organizer)
  if (organizer) lines.push(`organizer: ${yamlQuote(organizer)}`)
  const attendees = ev.attendees
    .map(personLabel)
    .filter((label): label is string => label !== null)
  if (attendees.length > 0) {
    lines.push('attendees:')
    for (const label of attendees) lines.push(`  - ${yamlQuote(label)}`)
  }
  if (ev.meetingUrl) lines.push(`meeting-url: ${yamlQuote(ev.meetingUrl)}`)
  lines.push('---', '', `# ${ev.title}`, '')
  let dateLine = `**${meetingDateLine(ev)}**`
  if (ev.location) dateLine += ` · ${ev.location}`
  lines.push(dateLine, '')
  // Teilnehmerliste zum Abhaken („wer war wirklich dabei?“);
  // Organisator zuerst, ohne Dublette, falls er auch als Teilnehmer geführt wird
  const checklist: string[] = []
  const organizerName = ev.organizer?.name ?? ev.organizer?.email
  if (organizerName) checklist.push(`${organizerName} (Organisator)`)
  for (const a of ev.attendees) {
    const name = a.name ?? a.email
    if (!name) continue
    const isOrganizer =
      (ev.organizer?.email && a.email === ev.organizer.email) || name === organizerName
    if (!isOrganizer) checklist.push(name)
  }
  if (checklist.length > 0) {
    lines.push('## Teilnehmer', '')
    for (const name of checklist) lines.push(`- [ ] ${name}`)
    lines.push('')
  }
  lines.push('## Agenda', '', '## Notizen', '', '## Aufgaben', '')
  return lines.join('\n')
}

import { parseCalendar } from '@merkzeug/core/ical'
import type { CalendarEvent } from '@merkzeug/core/calendar'
export interface CalendarSource { id: string; label: string; url?: string; text: string; updated: string; error?: string }
export interface CalendarSourceHost {
  load(): Promise<string | null>
  save(value: string): Promise<void>
  fetch(url: string): Promise<string>
}
export async function loadSources(host: CalendarSourceHost): Promise<CalendarSource[]> {
  const raw = await host.load()
  if (!raw) return []
  const sources: CalendarSource[] = JSON.parse(raw)
  if (!Array.isArray(sources)) throw new Error('Invalid calendar source storage.')
  return sources
}
export function feedUrl(raw: string): string {
  const url = new URL(raw.trim().replace(/^webcal:/i, 'https:'))
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS or Webcal subscription URL without a username or password.')
  return url.href
}
export function sourceEvents(sources: CalendarSource[], from: number, to: number): CalendarEvent[] {
  return sources.flatMap(source => parseCalendar(source.text, source.id, from, to).map(event => ({ ...event, calendar: source.label })))
}
export async function refreshSources(host: CalendarSourceHost): Promise<CalendarSource[]> {
  const sources = await loadSources(host)
  const updated = await Promise.all(sources.map(async source => {
    if (!source.url) return source
    try {
      const text = await host.fetch(source.url)
      parseCalendar(text, source.id, Date.now(), Date.now() + 14 * 86_400_000)
      return { ...source, text, updated: new Date().toISOString(), error: undefined }
    } catch { return { ...source, error: 'Refresh failed. Showing the last saved calendar.' } }
  }))
  await host.save(JSON.stringify(updated))
  return updated
}

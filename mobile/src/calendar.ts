import { loadSources, sourceEvents, type CalendarSourceHost } from '@merkzeug/editor/calendarSourceStore'
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { CalendarResult } from '@merkzeug/core/calendar'
const calendar = registerPlugin<{ sourcesLoad(): Promise<{ value: string | null }>; sourcesSave(options: { value: string }): Promise<void>; fetch(options: { url: string }): Promise<{ text: string }>; list(options: { fromMs: number; toMs: number }): Promise<CalendarResult> }>('MerkzeugCalendar')
export async function listCalendarEvents(fromMs: number, toMs: number): Promise<CalendarResult> {
  const native: CalendarResult = Capacitor.isNativePlatform() ? await calendar.list({ fromMs, toMs }) : { ok: false, error: 'unsupported', events: [] }
  const sources = await loadSources(calendarSourceHost)
  return sources.length ? { ok: true, events: [...native.events, ...sourceEvents(sources, fromMs, toMs)] } : native
}

let demoSources: string | null = null
export const calendarSourceHost: CalendarSourceHost = {
  load: async () => Capacitor.isNativePlatform() ? (await calendar.sourcesLoad()).value : demoSources,
  save: async value => { if (Capacitor.isNativePlatform()) await calendar.sourcesSave({ value }); else demoSources = value },
  fetch: async url => { if (Capacitor.isNativePlatform()) return (await calendar.fetch({ url })).text; throw new Error('Feed downloads require the native app.') }
}

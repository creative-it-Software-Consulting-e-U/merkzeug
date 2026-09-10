import type { CalendarSourceHost } from '@merkzeug/editor/calendarSourceStore'
export const calendarSourceHost: CalendarSourceHost = { load: () => window.merkzeug.calendarSourcesLoad(), save: value => window.merkzeug.calendarSourcesSave(value), fetch: url => window.merkzeug.calendarFetch(url) }

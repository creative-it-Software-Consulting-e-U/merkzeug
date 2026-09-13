import ICAL from 'ical.js'
import type { CalendarEvent, CalendarPerson } from './calendar.ts'
type Time = InstanceType<typeof ICAL.Time>
/** Resolve IANA zones absent from VTIMEZONE using the runtime's timezone database. */
function ianaZone(id: string): InstanceType<typeof ICAL.Timezone> {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: id, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  const zone = new ICAL.Timezone({ tzid: id })
  zone.utcOffset = (time: Time) => {
    const wall = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second)
    let guess = wall
    for (let i = 0; i < 4; i++) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p => [p.type, Number(p.value)]))
      const represented = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second)
      const offset = represented - guess
      const next = wall - offset
      if (next === guess) return offset / 1000
      guess = next
    }
    return (wall - guess) / 1000
  }
  return zone
}
function person(property: InstanceType<typeof ICAL.Property>): CalendarPerson {
  return { name: String(property.getParameter('cn') ?? '') || undefined, email: String(property.getFirstValue() ?? '').replace(/^mailto:/i, ''), optional: property.getParameter('role') === 'OPT-PARTICIPANT' }
}
export function parseCalendar(text: string, sourceId: string, fromMs: number, toMs: number): CalendarEvent[] {
  if (text.length > 2_000_000) throw new Error('Calendar exceeds 2 MB.')
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs || toMs - fromMs > 183 * 86_400_000) throw new Error('Invalid calendar date range.')
  const calendar = new ICAL.Component(ICAL.parse(text))
  if (calendar.name !== 'vcalendar') throw new Error('Expected an iCalendar file.')
  const lookup = calendar.getTimeZoneByID.bind(calendar)
  const fallback = new Map<string, InstanceType<typeof ICAL.Timezone>>()
  calendar.getTimeZoneByID = id => {
    const embedded = lookup(id)
    if (embedded) return embedded
    if (!fallback.has(id)) fallback.set(id, ianaZone(id))
    return fallback.get(id)!
  }
  const result = new Map<string, CalendarEvent>()
  let iterations = 0
  const components = calendar.getAllSubcomponents('vevent')
  for (const component of components) {
    if (component.hasProperty('recurrence-id')) continue
    if (!component.hasProperty('uid') || !component.hasProperty('dtstart')) throw new Error('Calendar event is missing UID or DTSTART.')
    if (component.getFirstPropertyValue('status') === 'CANCELLED') continue
    const uid = String(component.getFirstPropertyValue('uid'))
    const exceptions = components.filter(c => c.hasProperty('recurrence-id') && c.getFirstPropertyValue('uid') === uid)
    const event = new ICAL.Event(component, { exceptions })
    const iterator = event.iterator()
    let occurrence: Time | undefined | null
    while ((occurrence = iterator.next())) {
      if (++iterations > 50_000) throw new Error('Calendar recurrence limit exceeded. Use a smaller calendar export.')
      const details = event.getOccurrenceDetails(occurrence)
      const start = details.startDate.toJSDate(), end = details.endDate.toJSDate()
      if (occurrence.toJSDate().getTime() > toMs + 366 * 86_400_000) break
      const item = details.item.component
      if (item.getFirstPropertyValue('status') === 'CANCELLED' || end.getTime() <= fromMs || start.getTime() >= toMs) {
        if (!event.isRecurring()) break
        continue
      }
      const organizer = item.getFirstProperty('organizer')
      const identity = `${sourceId}:${uid}:${occurrence.toString()}`
      const url = String(item.getFirstPropertyValue('url') ?? '')
      result.set(identity, {
        id: `${sourceId}:${uid}`, identity,
        title: String(item.getFirstPropertyValue('summary') ?? ''),
        start: start.toISOString(), end: end.toISOString(), allDay: details.startDate.isDate,
        location: String(item.getFirstPropertyValue('location') ?? '') || undefined,
        calendar: String(calendar.getFirstPropertyValue('x-wr-calname') ?? '') || undefined,
        organizer: organizer ? person(organizer) : undefined,
        attendees: item.getAllProperties('attendee').map(person),
        meetingUrl: /^https?:\/\//i.test(url) ? url : undefined
      })
      if (!event.isRecurring()) break
    }
  }
  return [...result.values()].sort((a, b) => a.start.localeCompare(b.start))
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCalendar } from '../src/ical.ts'
const wrap = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events}\r\nEND:VCALENDAR`
const from = Date.parse('2026-03-27T00:00:00Z'), to = Date.parse('2026-04-03T00:00:00Z')
test('expands daily IANA recurrence across DST and excludes exceptions', () => {
  const text = wrap('BEGIN:VEVENT\nUID:daily\nDTSTART;TZID=Europe/Vienna:20260328T090000\nDTEND;TZID=Europe/Vienna:20260328T100000\nRRULE:FREQ=DAILY;COUNT=3\nEXDATE;TZID=Europe/Vienna:20260329T090000\nSUMMARY:Daily\nEND:VEVENT')
  const events = parseCalendar(text, 'source', from, to)
  assert.deepEqual(events.map(e => e.start), ['2026-03-28T08:00:00.000Z', '2026-03-30T07:00:00.000Z'])
})
test('cancellations, moved exceptions and all-day events preserve identity', () => {
  const text = wrap('BEGIN:VEVENT\nUID:weekly\nDTSTART:20260328T090000Z\nDTEND:20260328T100000Z\nRRULE:FREQ=DAILY;COUNT=3\nSUMMARY:Original\nEND:VEVENT\nBEGIN:VEVENT\nUID:weekly\nRECURRENCE-ID:20260329T090000Z\nDTSTART:20260329T110000Z\nDTEND:20260329T120000Z\nSUMMARY:Moved\nEND:VEVENT\nBEGIN:VEVENT\nUID:weekly\nRECURRENCE-ID:20260330T090000Z\nDTSTART:20260330T090000Z\nSTATUS:CANCELLED\nEND:VEVENT\nBEGIN:VEVENT\nUID:day\nDTSTART;VALUE=DATE:20260328\nDTEND;VALUE=DATE:20260329\nSUMMARY:All day\nEND:VEVENT')
  const events = parseCalendar(text, 'source', from, to)
  assert.equal(events.length, 3)
  assert.equal(events.filter(e => e.allDay).length, 1)
  assert.equal(events.find(e => e.title === 'Moved')?.identity, 'source:weekly:2026-03-29T09:00:00Z')
})
test('rejects malformed calendars and excessive ranges', () => {
  assert.throws(() => parseCalendar('bad', 'source', from, to))
  assert.throws(() => parseCalendar(wrap(''), 'source', from, from + 184 * 86_400_000))
})

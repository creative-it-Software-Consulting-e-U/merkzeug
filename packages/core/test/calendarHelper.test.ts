import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAccessOutput, parseHelperOutput } from '../src/calendarHelper.ts'

test('calendar helper output becomes events with detected meeting links', () => {
 const result = parseHelperOutput(JSON.stringify({ events: [{ id: 'e1', title: 'Review', start: '2026-10-21T09:00:00Z', end: '2026-10-21T10:00:00Z', allDay: false, notes: 'Join: https://teams.microsoft.com/l/meetup-join/abc and more', attendeeCount: 3 }] }))
 assert.equal(result.ok, true)
 assert.deepEqual(result.events[0].attendees, [])
 assert.equal(result.events[0].attendeeCount, 3)
 assert.equal(result.events[0].meetingUrl, 'https://teams.microsoft.com/l/meetup-join/abc')
})
test('calendar helper errors keep denied and unsupported apart from failures', () => {
 assert.deepEqual(parseHelperOutput('{"error":"denied"}'), { ok: false, error: 'denied', message: undefined, events: [] })
 assert.equal(parseHelperOutput('{"error":"unsupported"}').error, 'unsupported')
 assert.deepEqual(parseHelperOutput('{"error":"outlook","message":"Outlook missing"}'), { ok: false, error: 'failed', message: 'Outlook missing', events: [] })
})
test('calendar access status keeps known states and lists accounts', () => {
 assert.deepEqual(parseAccessOutput('{"access":"granted","accounts":["Exchange","iCloud"]}'), { system: 'macos', state: 'granted', accounts: ['Exchange', 'iCloud'] })
 assert.deepEqual(parseAccessOutput('{"access":"notDetermined","accounts":[]}'), { system: 'macos', state: 'notDetermined', accounts: [] })
 assert.equal(parseAccessOutput('{"error":"usage"}').state, 'failed')
})

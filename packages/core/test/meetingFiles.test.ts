import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ensureMeetingFile, firstHeading, headingFileBase, meetingIdentity } from '../src/meetingFiles.ts'
const note = (id: string, title: string, start = '2026-09-17T09:00:00Z') => `---\ncalendar-event: "${id}"\ncalendar-start: "${start}"\n---\n\n# ${title}\n\nMy notes`

test('meeting filenames preserve headings and safely replace forbidden characters', () => {
 assert.equal(headingFileBase('Team Abstimmung Österreich'), 'Team Abstimmung Österreich')
 assert.equal(headingFileBase('2026-09-17 Revision | BPP / Team'), '2026-09-17 Revision - BPP - Team')
 assert.equal(headingFileBase('CON'), '_CON')
 assert.equal(headingFileBase('..'), 'Meeting')
 assert.ok(new TextEncoder().encode(headingFileBase('ä'.repeat(300))).length <= 220)
 assert.equal(firstHeading(note('a', 'Title')), 'Title')
 assert.equal(firstHeading('```md\n# Ignore\n```\n\n# Actual'), 'Actual')
 assert.equal(meetingIdentity('# Ordinary note'), null)
})
test('calendar identity survives title changes and renaming; collisions preserve notes and assets', async () => {
 const disk = new Map<string, string>()
 const files = {
  list: async () => [...disk.keys()],
  read: async (path: string) => disk.get(path)!,
  exists: async (path: string) => disk.has(path),
  create: async (path: string, text: string) => { assert.ok(!disk.has(path)); disk.set(path, text) }
 }
 const first = await ensureMeetingFile('/vault', note('a', 'Team Meeting'), files)
 assert.equal(first, '/vault/Team Meeting.md')
 disk.set('/vault/Renamed.md', disk.get(first)! + '\nUser addition'); disk.delete(first)
 assert.equal(await ensureMeetingFile('/vault', note('a', 'New calendar title'), files), '/vault/Renamed.md')
 assert.match(disk.get('/vault/Renamed.md')!, /User addition/)
 disk.set('/vault/Team Meeting.assets', '')
 assert.equal(await ensureMeetingFile('/vault', note('b', 'Team Meeting'), files), '/vault/Team Meeting (2).md')
 assert.equal(await ensureMeetingFile('/vault', note('b', 'Team Meeting', '2026-09-18T09:00:00Z'), files), '/vault/Team Meeting (3).md')
 disk.set('/vault/meeting-abcdef.md', note('legacy', 'Old title'))
 assert.equal(await ensureMeetingFile('/vault', note('legacy', 'Updated title'), files), '/vault/meeting-abcdef.md')
})

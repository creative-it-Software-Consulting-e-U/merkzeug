import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (name: string) => readFileSync(new URL('../../' + name, import.meta.url), 'utf8')
test('current marketing release has bilingual notes and apps share the website source', () => {
  const version = read('VERSION').trim().replace(/\.0$/, '')
  const notes = JSON.parse(read('website/release-notes.json'))
  assert.equal(notes[0].version, version)
  assert.equal(new Set(notes.map(r => r.version)).size, notes.length)
  for (const entry of notes) {
    assert.ok(entry.highlights.en.length)
    assert.equal(entry.highlights.en.length, entry.highlights.de.length)
  }
  assert.match(read('packages/editor/src/ReleaseNotes.tsx'), /import releases from '\.\.\/\.\.\/\.\.\/website\/release-notes.json'/)
})

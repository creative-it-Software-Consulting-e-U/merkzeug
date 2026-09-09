import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vaultFileUrl, vaultFilePath } from '../src/vaultFileUrl.ts'

test('native image URLs round-trip Windows drives, UNC and reserved filename characters', () => {
  const cases = [
    ['C:\\Notes\\note.md', 'image.svg', 'win32', 'C:/Notes/image.svg'],
    ['C:\\Notes\\note.md', 'D:/Pictures/image.svg', 'win32', 'D:/Pictures/image.svg'],
    ['C:\\Notes\\note.md', '../a%20%23%3F%25.svg', 'win32', 'C:/a #?%.svg'],
    ['\\\\server\\share\\note.md', 'image.svg', 'win32', '//server/share/image.svg'],
    ['/Users/notes/note.md', 'image.svg', 'darwin', '/Users/notes/image.svg'],
    ['/home/notes/note.md', '/tmp/image.svg', 'linux', '/tmp/image.svg'],
  ]
  for (const [note, source, platform, expected] of cases) {
    const url = vaultFileUrl(note, source)
    assert.equal(new URL(url).hostname, 'local')
    assert.equal(vaultFilePath(url, platform), expected)
  }
  assert.equal(vaultFileUrl('/note.md', 'https://example.com/img.svg'), 'https://example.com/img.svg')
})

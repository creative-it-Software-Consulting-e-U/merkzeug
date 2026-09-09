import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripTypeScriptTypes } from 'node:module'
const source = readFileSync(new URL('../../crossplatform/src/main/fileRevisions.ts', import.meta.url), 'utf8')
const compiled = stripTypeScriptTypes(source)
const { FileRevisions } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))

test('independent windows reject stale writes; peeking cannot approve an overwrite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merkzeug-revisions-'))
  try {
    const path = join(dir, 'note.md'), target = join(dir, 'renamed.md')
    writeFileSync(path, 'original')
    const a = new FileRevisions(), b = new FileRevisions()
    a.read(path); b.read(path)
    a.write(path, 'first window')
    assert.throws(() => b.write(path, 'stale second window'), /CONFLICT/)
    b.read(path, { peek: true })
    assert.throws(() => b.write(path, 'still stale'), /CONFLICT/)
    assert.equal(readFileSync(path, 'utf8'), 'first window')
    b.read(path); b.write(path, 'explicitly reloaded')
    renameSync(path, target); b.move(path, target)
    b.write(target, 'saved after rename')
    writeFileSync(target, 'external edit')
    assert.throws(() => b.write(target, 'overwrite'), /CONFLICT/)
    assert.equal(readFileSync(target, 'utf8'), 'external edit')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripTypeScriptTypes } from 'node:module'
// crossplatform/ is CommonJS: load the ESM-style source like the other main-process tests
const core = new URL('../../packages/core/src/assistantTools.ts', import.meta.url).href
const source = readFileSync(new URL('../../crossplatform/src/main/ai/vaultTools.ts', import.meta.url), 'utf8').replace("'@merkzeug/core/assistantTools'", `'${core}'`)
const { VaultSession } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'))

function vault(): { root: string; outside: string; cleanup: () => void } {
  const base = mkdtempSync(join(tmpdir(), 'merkzeug-ai-vault-'))
  const root = join(base, 'vault')
  const outside = join(base, 'outside')
  mkdirSync(join(root, 'notes'), { recursive: true })
  mkdirSync(join(root, '.git'), { recursive: true })
  mkdirSync(join(root, 'node_modules'), { recursive: true })
  mkdirSync(outside)
  writeFileSync(join(root, 'notes', 'plan.md'), '# Plan\nBudget: 42\n')
  writeFileSync(join(root, '99_wording.md'), '# Wording\n- Vault: a folder of notes\n')
  writeFileSync(join(root, 'notes', 'image.png'), 'png')
  writeFileSync(join(root, '.git', 'config'), 'secret')
  writeFileSync(join(root, 'node_modules', 'x.md'), 'ignored')
  writeFileSync(join(outside, 'secret.md'), 'outside')
  symlinkSync(outside, join(root, 'link-out'))
  symlinkSync(join(root, 'notes'), join(root, 'link-in'))
  return { root, outside, cleanup: () => rmSync(base, { recursive: true, force: true }) }
}

const ignore = (path: string): boolean => path.endsWith('node_modules')

test('paths are confined to the vault: no .., absolute, home, hidden, ignored or escaping links', () => {
  const v = vault()
  try {
    const s = new VaultSession(v.root, 'read', ignore)
    for (const path of ['../outside/secret.md', '/etc/hosts', '~/x.md', 'C:/x.md', '.git/config', 'node_modules/x.md', 'link-out/secret.md', 'notes/image.png', '']) {
      assert.ok('error' in s.resolvePath(path, 'file'), path)
    }
    // absolute-looking paths are treated as vault-relative; links inside the vault are fine
    assert.equal((s.resolvePath('/notes/plan.md', 'file') as { path: string }).path, join(v.root, 'notes', 'plan.md'))
    assert.ok('path' in s.resolvePath('link-in/plan.md', 'file'))
    assert.ok('path' in s.resolvePath('', 'folder'))
  } finally {
    v.cleanup()
  }
})

test('list, search and read report activity and skip hidden, ignored and outside files', async () => {
  const v = vault()
  try {
    const s = new VaultSession(v.root, 'read', ignore)
    const seen: string[] = []
    const report = (a: { kind: string; path: string }): void => void seen.push(`${a.kind}:${a.path}`)
    const list = await s.run({ name: 'list_files', folder: '' }, report)
    assert.deepEqual(list.content.split('\n'), ['99_wording.md', 'notes/plan.md'])
    const hits = await s.run({ name: 'search_vault', query: 'BUDGET', folder: 'notes' }, report)
    assert.equal(hits.content, 'notes/plan.md:2: Budget: 42')
    const read = await s.run({ name: 'read_file', path: 'notes/plan.md' }, report)
    assert.equal(read.content, '# Plan\nBudget: 42\n')
    const denied = await s.run({ name: 'read_file', path: '../outside/secret.md' }, report)
    assert.equal(denied.isError, true)
    assert.deepEqual(seen, ['list:/', 'search:notes', 'read:notes/plan.md', 'denied:../outside/secret.md'])
  } finally {
    v.cleanup()
  }
})

test('read-only sessions refuse writes and ask for editing', async () => {
  const v = vault()
  try {
    const s = new VaultSession(v.root, 'read', ignore)
    const kinds: string[] = []
    const result = await s.run({ name: 'write_file', path: 'new.md', content: 'x' }, (a) => void kinds.push(a.kind))
    assert.equal(result.isError, true)
    assert.equal(existsSync(join(v.root, 'new.md')), false)
    await s.run({ name: 'request_write_access', reason: 'Add links' }, (a) => void kinds.push(a.kind))
    assert.deepEqual(kinds, ['denied', 'needsWrite'])
  } finally {
    v.cleanup()
  }
})

test('edits are exact, changes are listed and undo restores originals unless changed again', async () => {
  const v = vault()
  try {
    const s = new VaultSession(v.root, 'write', ignore)
    const none = (): void => {}
    const plan = join(v.root, 'notes', 'plan.md')
    assert.equal((await s.run({ name: 'edit_file', path: 'notes/plan.md', oldText: 'missing', newText: 'x', replaceAll: false }, none)).isError, true)
    assert.equal((await s.run({ name: 'edit_file', path: 'notes/plan.md', oldText: 'Budget', newText: '[Budget](../99_wording.md)', replaceAll: false }, none)).isError, false)
    await s.run({ name: 'edit_file', path: 'notes/plan.md', oldText: '42', newText: '43', replaceAll: false }, none)
    assert.equal(readFileSync(plan, 'utf8'), '# Plan\n[Budget](../99_wording.md): 43\n')
    await s.run({ name: 'write_file', path: 'notes/new/created.md', content: '# New\n' }, none)
    await s.run({ name: 'write_file', path: '99_wording.md', content: 'rewritten' }, none)
    assert.deepEqual(s.changeList(), [
      { path: '99_wording.md', kind: 'modified' },
      { path: 'notes/new/created.md', kind: 'created' },
      { path: 'notes/plan.md', kind: 'modified' }
    ])
    // the user edits one file again before undoing
    writeFileSync(join(v.root, '99_wording.md'), 'user edit')
    assert.deepEqual(s.undo(), { restored: ['notes/plan.md', 'notes/new/created.md'], skipped: ['99_wording.md'] })
    assert.equal(readFileSync(plan, 'utf8'), '# Plan\nBudget: 42\n')
    assert.equal(existsSync(join(v.root, 'notes', 'new', 'created.md')), false)
    assert.equal(readFileSync(join(v.root, '99_wording.md'), 'utf8'), 'user edit')
  } finally {
    v.cleanup()
  }
})

test('CLI runs are tracked through a snapshot', () => {
  const v = vault()
  try {
    const s = new VaultSession(v.root, 'write', ignore)
    assert.equal(s.takeSnapshot(), true)
    writeFileSync(join(v.root, 'notes', 'plan.md'), 'changed by cli')
    writeFileSync(join(v.root, 'cli.md'), 'new')
    rmSync(join(v.root, '99_wording.md'))
    s.collectSnapshotChanges()
    assert.deepEqual(s.changeList(), [
      { path: '99_wording.md', kind: 'deleted' },
      { path: 'cli.md', kind: 'created' },
      { path: 'notes/plan.md', kind: 'modified' }
    ])
    assert.deepEqual(s.undo().skipped, [])
    assert.equal(readFileSync(join(v.root, '99_wording.md'), 'utf8'), '# Wording\n- Vault: a folder of notes\n')
    assert.equal(existsSync(join(v.root, 'cli.md')), false)
  } finally {
    v.cleanup()
  }
})

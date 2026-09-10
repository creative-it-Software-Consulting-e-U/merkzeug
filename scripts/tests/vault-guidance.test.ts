import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendGuidance, readGuidance } from '../../crossplatform/src/main/vaultGuidance.mts'
test('guidance preserves concurrent writes, exclusive creation and root boundaries', () => {
  const root = mkdtempSync(join(tmpdir(), 'merkzeug-guidance-'))
  try {
    assert.equal(readGuidance(root, 'AGENTS.md'), null)
    appendGuidance(root, 'AGENTS.md', null, 'Original\n')
    assert.throws(() => appendGuidance(root, 'AGENTS.md', null, 'Lost'))
    writeFileSync(join(root, 'AGENTS.md'), 'External\n')
    assert.throws(() => appendGuidance(root, 'AGENTS.md', 'Original\n', 'Addition'))
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), 'External\n')
    appendGuidance(root, 'AGENTS.md', 'External\n', 'Addition')
    assert.equal(readGuidance(root, 'AGENTS.md'), 'External\nAddition')
    assert.throws(() => readGuidance(root, '../AGENTS.md' as any))
    symlinkSync(join(root, 'AGENTS.md'), join(root, 'CLAUDE.md'))
    assert.throws(() => readGuidance(root, 'CLAUDE.md'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

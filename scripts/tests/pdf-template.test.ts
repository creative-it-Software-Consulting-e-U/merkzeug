import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installTemplate } from '../../crossplatform/src/main/templateFiles.mts'

const source = fileURLToPath(new URL('../../resources/pdf-templates/Merkzeug', import.meta.url))
test('starter installs into a fresh root without overwriting user edits or restoring a disabled cover', () => {
  const root = mkdtempSync(join(tmpdir(), 'merkzeug-template-'))
  const target = join(root, 'templates', 'Merkzeug')
  try {
    assert.equal(installTemplate(source, target), true)
    assert.match(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /Editor preview versus PDF/)
    assert.match(readFileSync(join(target, 'STYLING-PROMPT.md'), 'utf8'), /{{TEMPLATE_PATH}}/)
    writeFileSync(join(target, 'AGENTS.md'), 'User instructions')
    assert.match(readFileSync(join(target, 'deckblatt.html'), 'utf8'), /{{titel}}/)
    writeFileSync(join(target, 'stil.css'), '/* my design */')
    rmSync(join(target, 'deckblatt.html'))
    assert.equal(installTemplate(source, target), false)
    assert.equal(readFileSync(join(target, 'AGENTS.md'), 'utf8'), 'User instructions')
    assert.equal(readFileSync(join(target, 'stil.css'), 'utf8'), '/* my design */')
    assert.equal(existsSync(join(target, 'deckblatt.html')), false)
    const copy = join(root, 'templates', 'My report')
    assert.equal(installTemplate(source, copy), true)
    assert.equal(readFileSync(join(copy, 'stil.css'), 'utf8'), readFileSync(join(source, 'stil.css'), 'utf8'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

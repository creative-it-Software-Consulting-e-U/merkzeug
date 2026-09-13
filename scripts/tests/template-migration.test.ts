import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateTemplateFiles } from '../../crossplatform/src/main/templateMigration.mts'

test('template migration preserves originals, copies assets and resumes without overwriting', () => {
  const root = mkdtempSync(join(tmpdir(), 'merkzeug-template-migrate-'))
  try {
    const source = join(root, 'local'), target = join(root, 'cloud')
    mkdirSync(join(source, 'Report', 'images'), { recursive: true })
    writeFileSync(join(source, 'Report', 'stil.css'), 'body{}')
    writeFileSync(join(source, 'Report', 'images', 'logo.svg'), '<svg/>')
    migrateTemplateFiles(source, target)
    migrateTemplateFiles(source, target)
    assert.equal(readFileSync(join(source, 'Report', 'stil.css'), 'utf8'), 'body{}')
    assert.equal(readFileSync(join(target, 'Report', 'images', 'logo.svg'), 'utf8'), '<svg/>')
    writeFileSync(join(source, 'Report', 'stil.css'), 'changed')
    writeFileSync(join(source, 'new.txt'), 'must not copy before validation')
    assert.throws(() => migrateTemplateFiles(source, target), /conflict/)
    assert.equal(readFileSync(join(target, 'Report', 'stil.css'), 'utf8'), 'body{}')
    assert.equal(existsSync(join(target, 'new.txt')), false)
    assert.throws(() => migrateTemplateFiles(source, join(source, 'nested')), /contain/)
    assert.throws(() => migrateTemplateFiles(source, root), /contain/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('template migration refuses linked content outside the source', () => {
  if (process.platform === 'win32') return
  const root = mkdtempSync(join(tmpdir(), 'merkzeug-template-links-'))
  try {
    const source = join(root, 'source'), target = join(root, 'target')
    mkdirSync(source); writeFileSync(join(root, 'private'), 'not a template')
    symlinkSync(join(root, 'private'), join(source, 'link'))
    assert.throws(() => migrateTemplateFiles(source, target), /symbolic links/)
    assert.equal(existsSync(target), false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

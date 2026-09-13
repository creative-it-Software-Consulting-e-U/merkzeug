import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateDefaultTemplates, windowsCloudTemplates } from '../../crossplatform/src/main/templateCloudPaths.mts'

test('Windows prefers registered iCloud locations and never invents an app container', () => {
  assert.equal(windowsCloudTemplates('C:\\Users\\test', ['D:\\Cloud'], p => p === 'D:\\Cloud\\Merkzeug'), 'D:\\Cloud\\Merkzeug\\Templates')
  assert.equal(windowsCloudTemplates('C:\\Users\\test', [], p => p === 'C:\\Users\\test\\iCloudDrive\\Merkzeug'), 'C:\\Users\\test\\iCloudDrive\\Merkzeug\\Templates')
  assert.equal(windowsCloudTemplates('C:\\Users\\test', [], () => false), null)
})

test('default migration switches only after verification, keeps custom roots and keeps configuration on conflicts', () => {
  const root = mkdtempSync(join(tmpdir(), 'merkzeug-default-cloud-'))
  try {
    const user = join(root, 'user'), cloud = join(root, 'cloud'), local = join(user, 'PDF-Vorlagen')
    mkdirSync(local, { recursive: true }); writeFileSync(join(local, 'style.css'), 'original')
    let configured: string | undefined
    const save = (path: string) => { assert.equal(readFileSync(join(path, 'style.css'), 'utf8'), 'original'); configured = path }
    migrateDefaultTemplates(user, cloud, join(root, 'custom'), save)
    assert.equal(configured, undefined)
    migrateDefaultTemplates(user, cloud, undefined, save)
    assert.equal(configured, cloud)
    assert.equal(readFileSync(join(local, 'style.css'), 'utf8'), 'original')
    configured = local; writeFileSync(join(cloud, 'style.css'), 'cloud changes')
    assert.throws(() => migrateDefaultTemplates(user, cloud, configured, save), /conflict/)
    assert.equal(configured, local)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

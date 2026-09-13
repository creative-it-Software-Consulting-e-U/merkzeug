import { t } from '@merkzeug/core/i18n'
import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { migrateDefaultTemplates, windowsCloudTemplates } from './templateCloudPaths.mjs'
import { execFile } from 'node:child_process'
import { getStoredTemplatesRoot, setStoredTemplatesRoot } from './settings'
import { migrateTemplateFiles } from './templateMigration.mjs'

let cloudRoot: string | null = null
let problem: string | null = null
let pending: Promise<void> | undefined
export const templateCloudState = () => ({ cloudRoot, cloudError: problem, cloudSupported: process.platform === 'darwin' || process.platform === 'win32' })

async function windowsRoot(): Promise<string | null> {
  const registered = await new Promise<string[]>(done => {
    const script = "$ErrorActionPreference='Stop'; $paths=@(); foreach($base in @('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager')) { if(Test-Path $base) { Get-ChildItem $base | Where-Object { $_.PSChildName -match 'iCloud' } | ForEach-Object { $key=Join-Path $_.PSPath 'UserSyncRoots'; if(Test-Path $key) { $v=Get-Item $key; foreach($n in $v.GetValueNames()) { $paths += $v.GetValue($n) } } } } }; ConvertTo-Json -InputObject @($paths) -Compress";
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 5000, windowsHide: true }, (error, stdout) => {
      try { const value = JSON.parse(stdout); done(!error && Array.isArray(value) ? value.filter(x => typeof x === 'string') : []) } catch { done([]) }
    })
  })
  return windowsCloudTemplates(app.getPath('home'), registered)
}

export function refreshTemplateCloud(): Promise<void> {
  if (pending) return pending
  pending = (async () => {
    cloudRoot = null; problem = null
    if (process.env.MERKZEUG_TEMPLATES_ROOT) return // isolated test profiles must never migrate user templates
    if (process.platform === 'darwin') {
      const addonPath = app.isPackaged ? join(process.resourcesPath, 'icloud/merkzeug-icloud.node') : join(__dirname, '../../resources/icloud/merkzeug-icloud.node')
      if (!existsSync(addonPath)) return
      const native = require(addonPath) as { container(): Promise<string | null> }
      const container = await native.container()
      cloudRoot = container ? join(container, 'Documents', 'Templates') : null
    } else if (process.platform === 'win32') cloudRoot = await windowsRoot()
    if (cloudRoot && process.platform === 'darwin') {
      migrateDefaultTemplates(app.getPath('userData'), cloudRoot, getStoredTemplatesRoot(), setStoredTemplatesRoot)
    }
  })().catch(error => { problem = String(error) }).finally(() => { pending = undefined })
  return pending
}
export async function migrateTemplatesToCloud(): Promise<void> {
  await refreshTemplateCloud()
  if (!cloudRoot) throw new Error(t('iCloud templates are not available. Open Merkzeug on an Apple device and enable iCloud Drive.'))
  const source = getStoredTemplatesRoot() ?? join(app.getPath('userData'), 'PDF-Vorlagen')
  if (!existsSync(source)) throw new Error(t('The current templates folder is unavailable. Nothing was migrated.'))
  migrateTemplateFiles(source, cloudRoot)
  setStoredTemplatesRoot(cloudRoot)
  problem = null
}

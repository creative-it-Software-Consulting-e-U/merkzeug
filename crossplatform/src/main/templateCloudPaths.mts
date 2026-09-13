import { existsSync } from 'node:fs'
import { join, resolve, win32 } from 'node:path'
import { migrateTemplateFiles } from './templateMigration.mts'

export function windowsCloudTemplates(home: string, registered: string[], exists: (path: string) => boolean = existsSync): string | null {
  for (const drive of [...registered, win32.join(home, 'iCloudDrive'), win32.join(home, 'iCloud Drive')]) {
    const container = win32.join(drive, 'Merkzeug')
    if (exists(container)) return win32.join(container, 'Templates')
  }
  return null
}
export function migrateDefaultTemplates(userData: string, cloudRoot: string, configured: string | undefined, setRoot: (path: string) => void): void {
  const oldDefault = join(userData, 'PDF-Vorlagen')
  if (configured && resolve(configured) !== resolve(oldDefault)) return
  migrateTemplateFiles(oldDefault, cloudRoot)
  setRoot(cloudRoot)
}

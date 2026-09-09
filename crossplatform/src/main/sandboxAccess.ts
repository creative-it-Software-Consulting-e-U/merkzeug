import { t } from '@merkzeug/core/i18n'
import { app } from 'electron'
import { loadSettings, saveSettings } from './settings'

// Keep one scope per selected folder alive until app exit, including across windows.
const active = new Map<string, () => void>()

export function rememberFolderAccess(path: string, bookmark?: string): void {
  if (!process.mas) return
  if (!bookmark) throw new Error(t('macOS did not grant persistent access to the selected folder.'))
  const stop = app.startAccessingSecurityScopedResource(bookmark)
  active.get(path)?.()
  active.set(path, () => stop())
  const settings = loadSettings()
  settings.folderBookmarks ??= {}
  settings.folderBookmarks[path] = bookmark
  saveSettings()
}

export function restoreFolderAccess(): void {
  if (!process.mas) return
  for (const [path, bookmark] of Object.entries(loadSettings().folderBookmarks ?? {})) {
    try { const stop = app.startAccessingSecurityScopedResource(bookmark); active.set(path, () => stop()) }
    catch { /* A moved/revoked folder can be selected again to renew its bookmark. */ }
  }
  app.once('will-quit', () => {
    for (const stop of active.values()) stop()
    active.clear()
  })
}

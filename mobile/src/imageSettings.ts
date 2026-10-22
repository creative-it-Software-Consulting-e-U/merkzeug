import { effectiveImageInsert, vaultImageInsert, withVaultImageInsert, type ImageInsertMode } from '@merkzeug/core/imageInsert'
import { t } from '@merkzeug/core/i18n'
import { settingsPath } from './templates'
import { vault } from './vault'

const appKey = 'merkzeug.imagesAsHtml'

export function appImagesAsHtml(): boolean {
  try { return localStorage.getItem(appKey) === 'true' } catch { return false }
}

export function setAppImagesAsHtml(value: boolean): void {
  try { localStorage.setItem(appKey, String(value)) } catch { /* bleibt für diese Sitzung beim Standard */ }
}

export async function vaultImageMode(): Promise<ImageInsertMode | null> {
  try {
    if (!await vault.exists(settingsPath)) return null
    return vaultImageInsert(JSON.parse((await vault.readFile(settingsPath)).content))
  } catch {
    return null
  }
}

/** Festlegung im Vault (`.merkzeug/settings.json`); `null` folgt wieder der App-Einstellung. */
export async function setVaultImageMode(mode: ImageInsertMode | null): Promise<void> {
  const current = await vault.exists(settingsPath) ? await vault.readFile(settingsPath) : null
  const settings = current ? JSON.parse(current.content) : {}
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error(t('Invalid vault settings.'))
  if (!await vault.exists('/.merkzeug')) await vault.createFolder('/.merkzeug')
  await vault.writeFile(settingsPath, JSON.stringify(withVaultImageInsert(settings, mode), null, 2) + '\n', current?.mtime ?? 0)
}

export async function imageInsertMode(): Promise<ImageInsertMode> {
  return effectiveImageInsert(appImagesAsHtml(), await vaultImageMode())
}

import { effectiveImageInsert, vaultImageInsert, withVaultImageInsert, type ImageInsertMode } from '@merkzeug/core/imageInsert'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ImageSettings } from '../shared/types'
import { getImagesAsHtml } from './settings'
import { vaultSettingsPath } from './templates'

function vaultMode(vault: string | null): ImageInsertMode | null {
  if (!vault) return null
  try {
    return vaultImageInsert(JSON.parse(readFileSync(vaultSettingsPath(vault), 'utf8')))
  } catch {
    return null
  }
}

export function getImageSettings(vault: string | null): ImageSettings {
  return { appHtml: getImagesAsHtml(), vault: vaultMode(vault) }
}

export function imageInsertMode(vault: string | null): ImageInsertMode {
  return effectiveImageInsert(getImagesAsHtml(), vaultMode(vault))
}

/** Festlegung im Vault (`.merkzeug/settings.json`); `null` folgt wieder der App-Einstellung. */
export function setVaultImageInsert(vault: string, mode: ImageInsertMode | null): void {
  const path = vaultSettingsPath(vault)
  let cfg: Record<string, unknown> = {}
  if (existsSync(path)) cfg = JSON.parse(readFileSync(path, 'utf8'))
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Invalid vault settings')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(withVaultImageInsert(cfg, mode), null, 2)}\n`)
}

/**
 * Wie neu eingefügte Bilder geschrieben werden: als Markdown-Bild oder als
 * HTML-`<img>`. Die App-Einstellung gilt, solange der Vault in
 * `.merkzeug/settings.json` (`"imageInsert"`) nichts anderes festlegt.
 */

export type ImageInsertMode = 'markdown' | 'html'

/** Festlegung des Vaults; `null` folgt der App-Einstellung. */
export function vaultImageInsert(settings: unknown): ImageInsertMode | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const value = (settings as Record<string, unknown>).imageInsert
  return value === 'html' || value === 'markdown' ? value : null
}

/** Vault-Einstellungen mit geänderter Bild-Festlegung; übrige Einträge bleiben erhalten. */
export function withVaultImageInsert(settings: Record<string, unknown>, mode: ImageInsertMode | null): Record<string, unknown> {
  const next = { ...settings }
  if (mode) next.imageInsert = mode
  else delete next.imageInsert
  return next
}

export function effectiveImageInsert(appHtml: boolean, vault: ImageInsertMode | null): ImageInsertMode {
  return vault ?? (appHtml ? 'html' : 'markdown')
}

import type { ImageInsertMode } from '@merkzeug/core/imageInsert'
import { t as translate } from '@merkzeug/core/i18n'

/**
 * Einstellung „Bilder als HTML-`<img>` einfügen“: App-weit und – sofern ein
 * Vault offen ist – abweichend für diesen Vault (`.merkzeug/settings.json`).
 */
export function ImageInsertSettings({ appHtml, vault, hasVault, onAppChange, onVaultChange }: {
  appHtml: boolean
  vault: ImageInsertMode | null
  hasVault: boolean
  onAppChange(value: boolean): void
  onVaultChange(value: ImageInsertMode | null): void
}) {
  return <div className="image-insert-settings" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
    <label>
      <input type="checkbox" checked={appHtml} onChange={event => onAppChange(event.target.checked)} />{' '}
      {translate('Insert images as HTML <img> tags')}
    </label>
    {hasVault && <label>
      {translate('In this vault')}{' '}
      <select value={vault ?? ''} onChange={event => onVaultChange((event.target.value || null) as ImageInsertMode | null)}>
        <option value="">{appHtml ? translate('Like the app setting (HTML <img>)') : translate('Like the app setting (Markdown)')}</option>
        <option value="html">{translate('HTML <img> tag')}</option>
        <option value="markdown">{translate('Markdown image')}</option>
      </select>
    </label>}
    <p className="settings-hint">
      {translate('HTML <img> tags keep a size and alignment, which you set by clicking the image. The vault choice is stored in .merkzeug/settings.json, travels with Git and overrides the app setting.')}
    </p>
  </div>
}

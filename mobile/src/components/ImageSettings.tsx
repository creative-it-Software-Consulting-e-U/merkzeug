import { ImageInsertSettings } from '@merkzeug/editor/ImageInsertSettings'
import type { ImageInsertMode } from '@merkzeug/core/imageInsert'
import { t } from '@merkzeug/core/i18n'
import { useEffect, useState } from 'react'
import { appImagesAsHtml, setAppImagesAsHtml, setVaultImageMode, vaultImageMode } from '../imageSettings'

export function ImageSettings() {
  const [appHtml, setAppHtml] = useState(appImagesAsHtml)
  const [vaultMode, setVaultMode] = useState<ImageInsertMode | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void vaultImageMode().then(mode => { if (active) setVaultMode(mode) })
    return () => { active = false }
  }, [])
  return <details className="mobile-template-settings">
    <summary>{t('Images')}</summary>
    <div className="mobile-template-controls">
      <ImageInsertSettings
        appHtml={appHtml}
        vault={vaultMode}
        hasVault
        onAppChange={value => { setAppImagesAsHtml(value); setAppHtml(value) }}
        onVaultChange={value => {
          setError('')
          setVaultImageMode(value).then(() => setVaultMode(value), e => setError(String(e)))
        }}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  </details>
}

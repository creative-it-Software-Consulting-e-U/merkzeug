import { useEffect, useState } from 'react'
import { liveTemplateCss } from '@merkzeug/editor/templateStyle'
import { t } from '@merkzeug/core/i18n'
export function LiveTemplate({ vault }: { vault: string }) {
  const key = `templateLive:${vault}`
  const [enabled, setEnabled] = useState(() => localStorage.getItem(key) === 'true')
  const [css, setCss] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const refresh = () => {
      void window.merkzeug.getLiveTemplate().then(template => {
        if (!active) return
        setCss(template?.css ? liveTemplateCss(template.css) : '')
        setError('')
      }).catch(e => { if (active) { setCss(''); setError(String(e)) } })
    }
    refresh(); window.addEventListener('focus', refresh)
    const offSettings = window.merkzeug.onSettingsRefresh(refresh)
    const off = window.merkzeug.onVaultChanged(refresh)
    return () => { active = false; window.removeEventListener('focus', refresh); off(); offSettings() }
  }, [vault])
  useEffect(() => {
    document.querySelector('.app')?.classList.toggle('template-live', enabled && !!css)
    return () => document.querySelector('.app')?.classList.remove('template-live')
  }, [enabled, css])
  return <div className="live-template-bar">
    <button onClick={() => void window.merkzeug.openSettings()}>{t("Settings")}</button>
    <label><input type="checkbox" checked={enabled} onChange={event => { setEnabled(event.target.checked); localStorage.setItem(key, String(event.target.checked)) }} /> {t('Use PDF template while editing')}</label>
    {enabled && !css && <span>{t('Assign a PDF template in Settings to preview its content styles.')}</span>}
    {error && <span role="alert">{error}</span>}
    {enabled && <style>{css}</style>}
  </div>
}

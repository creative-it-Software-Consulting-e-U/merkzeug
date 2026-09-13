import { useEffect, useState } from 'react'
import type { PdfTemplate } from '@merkzeug/core/pdf'
import { t } from '@merkzeug/core/i18n'
import { liveTemplateCss } from '@merkzeug/editor/templateStyle'
import { TemplateStylingPrompt } from '@merkzeug/editor/TemplateStylingPrompt'
import { assignedTemplate, assignTemplate, loadTemplate, templateFolder, pickTemplateFolder, type TemplateFolder } from '../templates'

export function TemplateSettings({ vaultId, onChange }: { vaultId: string; onChange(template: PdfTemplate | null): void }) {
  const key = `templateLive:${vaultId}`
  const [enabled, setEnabled] = useState(() => localStorage.getItem(key) === 'true')
  const [folder, setFolder] = useState<TemplateFolder>({ templates: [] })
  const [selected, setSelected] = useState('')
  const [template, setTemplate] = useState<PdfTemplate | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [css, setCss] = useState('')
  useEffect(() => {
    let active = true
    let generation = 0
    const refresh = async () => {
      const token = ++generation
      try {
        const [nextFolder, name] = await Promise.all([templateFolder(), assignedTemplate()])
        if (!active || token !== generation) return
        setFolder(nextFolder); setSelected(name ?? '')
        const next = name ? await loadTemplate(name) : null
        if (!active || token !== generation) return
        setTemplate(next); onChange(next); setError('')
      } catch (e) { if (active && token === generation) { setTemplate(null); onChange(null); setError(String(e)) } }
    }
    const visible = () => { if (!document.hidden) void refresh() }
    void refresh()
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('merkzeug-templates-change', visible)
    return () => { active = false; document.removeEventListener('visibilitychange', visible); window.removeEventListener('merkzeug-templates-change', visible) }
  }, [vaultId, onChange])
  useEffect(() => {
    try { setCss(enabled && template?.css ? liveTemplateCss(template.css) : '') }
    catch (e) { setCss(''); setError(String(e)) }
  }, [enabled, template])
  useEffect(() => {
    document.querySelector('.app')?.classList.toggle('template-live', !!css)
    return () => document.querySelector('.app')?.classList.remove('template-live')
  }, [css])
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await action(); window.dispatchEvent(new Event('merkzeug-templates-change')) }
    catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <details className="mobile-template-settings">
    <summary>{t('PDF templates')}</summary>
    <div className="mobile-template-controls">
      <span>{folder.name ?? t('Choose templates folder')}</span>
      <button disabled={busy} onClick={() => void run(pickTemplateFolder)}>{t('Change…')}</button>
      <button disabled={busy} onClick={() => window.dispatchEvent(new Event('merkzeug-templates-change'))}>{t('Refresh')}</button>
      <label>{t('Template for this vault')} <select disabled={busy} value={selected} onChange={event => void run(() => assignTemplate(event.target.value || null))}>
        <option value="">{t('No template')}</option>
        {folder.templates.map(name => <option key={name}>{name}</option>)}
        {selected && !folder.templates.includes(selected) && <option value={selected}>{selected} ({t('missing')})</option>}
      </select></label>
      <label><input type="checkbox" checked={enabled} onChange={event => { setEnabled(event.target.checked); localStorage.setItem(key, String(event.target.checked)) }} /> {t('Use PDF template while editing')}</label>
    </div>
    <TemplateStylingPrompt />
    {error && <p role="alert">{error}</p>}
    {css && <style>{css}</style>}
  </details>
}

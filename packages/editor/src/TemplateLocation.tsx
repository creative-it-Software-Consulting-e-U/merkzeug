import { useEffect, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
import { validateTemplateSelection } from '@merkzeug/core/templateSelection'
export function TemplateLocation({ value, templates, onChange }: { value: string | null; templates: string[]; onChange(value: string | null): Promise<unknown> }) {
  const [source, setSource] = useState(value?.startsWith('vault:') ? 'vault' : 'central')
  const [path, setPath] = useState(value?.startsWith('vault:') ? value.slice(6) : '.merkzeug/templates/Merkzeug')
  const [central, setCentral] = useState(value && !value.startsWith('vault:') ? value : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setSource(value?.startsWith('vault:') ? 'vault' : 'central'); setCentral(value && !value.startsWith('vault:') ? value : ''); if (value?.startsWith('vault:')) setPath(value.slice(6)) }, [value])
  const save = async (next: string | null) => {
    setBusy(true); setError('')
    try { if (next) validateTemplateSelection(next); await onChange(next) } catch(e) { setError(String(e)) } finally { setBusy(false) }
  }
  return <fieldset style={{ border: '1px solid var(--border, #aaa)', padding: '8px', margin: '4px 0', minWidth: 0 }}>
    <legend>{t('PDF template for this vault')}</legend>
    <label>{t('Location')} <select disabled={busy} value={source} onChange={e => setSource(e.target.value)}><option value="central">{t('Central template')}</option><option value="vault">{t('Template inside this vault')}</option></select></label>{' '}
    {source === 'central' ? <><select aria-label={t('Central template')} disabled={busy} value={central} onChange={e => setCentral(e.target.value)}><option value="">{t('No template')}</option>{[...new Set([...templates, ...(value && !value.startsWith('vault:') ? [value] : [])])].map(name => <option key={name}>{name}</option>)}</select> <button disabled={busy} onClick={() => void save(central || null)}>{t('Apply')}</button></> : <><input aria-label={t('Relative template folder')} style={{ maxWidth: '100%' }} value={path} onChange={e => setPath(e.target.value)} placeholder=".merkzeug/templates/Merkzeug" disabled={busy} /> <button disabled={busy} onClick={() => void save('vault:' + path.trim())}>{t('Apply')}</button></>}
    {error && <span role="alert">{error}</span>}
  </fieldset>
}

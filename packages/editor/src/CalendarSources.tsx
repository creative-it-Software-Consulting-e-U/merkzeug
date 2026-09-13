import { useEffect, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
import { parseCalendar } from '@merkzeug/core/ical'
import { feedUrl, loadSources, refreshSources, type CalendarSource, type CalendarSourceHost } from './calendarSourceStore'
export function CalendarSources({ host, onChange }: { host: CalendarSourceHost; onChange?: () => void }) {
  const [sources, setSources] = useState<CalendarSource[]>([])
  const [label, setLabel] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { void loadSources(host).then(setSources).catch(e => setError(String(e))) }, [host])
  async function run(action: () => Promise<CalendarSource[]>) {
    setBusy(true); setError('')
    try { const result = await action(); setSources(result); onChange?.() } catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  async function add(text: string, name: string, subscription?: string) {
    const previous = await loadSources(host)
    const existing = !subscription ? previous.find(source => !source.url && (source.label === name || source.text === text)) : undefined
    const id = existing?.id ?? crypto.randomUUID()
    parseCalendar(text, id, Date.now(), Date.now() + 14 * 86_400_000)
    if (subscription && previous.some(s => s.url === subscription)) throw new Error(t('This calendar is already subscribed.'))
    const result = [...previous.filter(source => source.id !== id), { id, label: name, url: subscription, text, updated: new Date().toISOString() }]
    await host.save(JSON.stringify(result)); setUrl(''); setLabel(''); return result
  }
  return <details className="calendar-sources"><summary>{t('Calendar sources')}</summary>
    <p>{t('Import an ICS file or subscribe to a private HTTPS/Webcal feed. Subscriptions are stored on this device.')}</p>
    <label>{t('Import ICS file')} <input aria-label={t('Import ICS file')} type="file" accept=".ics,text/calendar" disabled={busy} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ''
      if (file) void run(async () => { if (file.size > 2_000_000) throw new Error('Calendar exceeds 2 MB.'); return add(await file.text(), file.name) })
    }} /></label>
    <div><input aria-label={t('Calendar name')} placeholder={t('Calendar name')} value={label} onChange={e => setLabel(e.target.value)} disabled={busy} />{' '}
      <input aria-label={t('Private feed URL')} type="password" autoComplete="off" placeholder={t('Private feed URL')} value={url} onChange={e => setUrl(e.target.value)} disabled={busy} />{' '}
      <button disabled={busy || !label.trim() || !url.trim()} onClick={() => void run(async () => { const normalized = feedUrl(url); return add(await host.fetch(normalized), label.trim(), normalized) })}>{t('Subscribe')}</button></div>
    <button disabled={busy || !sources.length} onClick={() => void run(() => refreshSources(host))}>{t('Refresh calendars')}</button>
    <ul>{sources.map(source => <li key={source.id}>{source.label} · {new Date(source.updated).toLocaleString()} {source.error && <span role="status">{t(source.error)}</span>}{' '}
      <button disabled={busy} onClick={() => void run(async () => { const latest = await loadSources(host); const result = latest.filter(s => s.id !== source.id); await host.save(JSON.stringify(result)); return result })}>{t('Remove')}</button>
    </li>)}</ul>
    {error && <p role="alert">{error}</p>}
  </details>
}

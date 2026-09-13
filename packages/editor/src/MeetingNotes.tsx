import { CalendarSources } from './CalendarSources'
import { useEffect, useRef, useState } from 'react'
import { t } from '@merkzeug/core/i18n'
import type { CalendarEvent } from '@merkzeug/core/calendar'
import { localDate, meetingNoteContent, meetingNoteFileName, meetingTimeLabel } from '@merkzeug/core/meetingNote'
import type { CalendarResult } from '@merkzeug/core/calendar'
import type { CalendarSourceHost } from './calendarSourceStore'
export interface MeetingHost { sources: CalendarSourceHost; list(from: number, to: number): Promise<CalendarResult>; create(path: string, content: string): Promise<void> }

export function MeetingNotes({ host, folder, onOpen, onClose }: { host: MeetingHost; folder: string; onOpen: (path: string) => void; onClose: () => void }) {
  const [day, setDay] = useState(localDate(new Date()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const creating = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setEvents([])
    const from = new Date(`${day}T00:00:00`)
    const to = new Date(from); to.setDate(to.getDate() + 14)
    void host.list(from.getTime(), to.getTime()).then(result => {
      if (!active) return
      if (result.ok) setEvents(result.events)
      else setError(result.error === 'denied' ? t('Allow calendar access in iOS Settings to choose a meeting.') : result.error === 'unsupported' ? t('The native calendar is available on iPhone and iPad.') : result.message ?? t('Could not load calendar events.'))
    }).catch(e => { if (active) setError(String(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [day, refresh])
  useEffect(() => { const visible = () => { if (document.visibilityState === 'visible') setRefresh(v => v + 1) }; document.addEventListener('visibilitychange', visible); return () => document.removeEventListener('visibilitychange', visible) }, [])
  async function create(event: CalendarEvent) {
    if (creating.current) return
    creating.current = true; setBusy(true); setError('')
    try {
      // Stable identity keeps repeat selections and changed titles on the same note.
      const path = `${folder.replace(/\/$/, '')}/${await meetingNoteFileName(event)}`
      await host.create(path, meetingNoteContent(event))
      onOpen(path)
    } catch (e) { setError(String(e)) }
    finally { creating.current = false; setBusy(false) }
  }
  return <div className="meeting-backdrop"><section role="dialog" aria-modal="true" aria-label={t('New meeting note')} className="meeting-sheet">
    <header><h2>{t('New meeting note')}</h2><button onClick={onClose} disabled={busy}>{t('Close')}</button></header>
    <CalendarSources host={host.sources} onChange={() => setRefresh(v => v + 1)} />
    <p>{t('Choose an event from the next 14 days. Your calendar stays unchanged.')}</p>
    <label>{t('From')} <input type="date" value={day} disabled={busy} onChange={e => { if (e.target.value) setDay(e.target.value) }} /></label>{' '}
    <button disabled={loading || busy} onClick={() => setRefresh(v => v + 1)}>{t('Refresh')}</button>
    {loading && <p role="status">{t('Loading …')}</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && events.length === 0 && <p>{t('No events in this date range.')}</p>}
    <div className="meeting-events">{events.map(event => <button key={`${event.id}@${event.start}`} disabled={busy} onClick={() => void create(event)}>
      <strong>{event.title}</strong><span>{localDate(new Date(event.start))} · {meetingTimeLabel(event)} · {event.calendar}</span>
    </button>)}</div>
  </section></div>
}

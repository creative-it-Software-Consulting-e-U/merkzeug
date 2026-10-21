import { useEffect, useState } from 'react'
import { setLocale } from '@merkzeug/core/i18n'
import { parseHelperOutput } from '@merkzeug/core/calendarHelper'
import type { CalendarResult } from '@merkzeug/core/calendar'
import { ensureMeetingFile } from '@merkzeug/core/meetingFiles'
import { MeetingNotes, type MeetingHost } from '@merkzeug/editor/MeetingNotes'
import { loadSources, sourceEvents, type CalendarSourceHost } from '@merkzeug/editor/calendarSourceStore'
import { setHostTheme, setTheme } from '@merkzeug/editor/theme'
import { request } from './bridge'

const sources: CalendarSourceHost = {
  load: () => request('calendarSourcesLoad'),
  save: value => request('calendarSourcesSave', { value }),
  fetch: url => request('calendarFetch', { url })
}

/** Classic Outlook (Windows) answers with the desktop helper's JSON; other systems use calendar sources only. */
async function system(from: number, to: number): Promise<CalendarResult | null> {
  const output = await request<string | null>('calendarList', { from, to })
  return output ? parseHelperOutput(output) : null
}

const host: MeetingHost = {
  sources,
  list: async (from, to) => {
    const native = await system(from, to)
    const own = sourceEvents(await loadSources(sources), from, to)
    if (native && !native.ok && !own.length) return native
    return { ok: true, events: [...(native?.ok ? native.events : []), ...own].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) }
  },
  detail: async event => {
    if (event.identity) return event
    const output = await request<string | null>('calendarDetail', { id: event.id, start: event.start }).catch(() => null)
    const detail = output ? parseHelperOutput(output).events[0] : undefined
    return detail ? { ...event, attendees: detail.attendees, attendeeCount: detail.attendees.length, meetingUrl: detail.meetingUrl ?? event.meetingUrl } : event
  },
  create: (path, content) => ensureMeetingFile(path.slice(0, path.lastIndexOf('/')), content, {
    list: folder => request('meetingList', { folder }),
    read: path => request('read', { path }),
    exists: path => request('exists', { path }),
    create: (path, content) => request('meetingCreate', { path, content })
  })
}

export function MeetingApp() {
  const [folder, setFolder] = useState<string>()
  useEffect(() => {
    void request('init').then(info => { setLocale(info.locale); setTheme('system'); setHostTheme(info.theme); setFolder(info.folder) })
  }, [])
  if (!folder) return null
  return <div className="ide-meeting">
    <MeetingNotes host={host} folder={folder} onOpen={path => void request('meetingOpen', { path })} onClose={() => void request('meetingClose')} />
  </div>
}

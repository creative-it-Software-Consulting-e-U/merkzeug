import { t as translate, getLocale } from '@merkzeug/core/i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, CalendarResult } from '../../../shared/types'
import { localDate, meetingTimeLabel } from '../util/meetingNote'

interface MeetingNoteDialogProps {
  onPick: (ev: CalendarEvent) => void
  onCancel: () => void
}

const DAY = 86_400_000
/** Standard-Ansicht: laufende und kommende Termine bis … */
const UPCOMING_DAYS = 14
/** „Frühere anzeigen“: zurück bis … */
const PAST_DAYS = 14
/** Suche: Zeitraum ± … */
const SEARCH_DAYS = 90

/** Schlüssel zum Deduplizieren (Serientermine haben dieselbe id je Vorkommen nicht) */
const eventKey = (ev: CalendarEvent): string => `${ev.id}@${ev.start}`

const dayFormat = new Intl.DateTimeFormat(getLocale(), {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function dayLabel(start: string, now: number): string {
  const date = localDate(new Date(start))
  if (date === localDate(new Date(now))) return translate("Today")
  if (date === localDate(new Date(now + DAY))) return translate("Tomorrow")
  if (date === localDate(new Date(now - DAY))) return translate("Yesterday")
  return dayFormat.format(new Date(start))
}

function metaLabel(ev: CalendarEvent): string {
  const parts: string[] = []
  const organizer = ev.organizer?.name ?? ev.organizer?.email
  if (organizer) parts.push(organizer)
  const count = ev.attendeeCount ?? ev.attendees.length
  if (count > 0) {
    parts.push(count === 1 ? translate("1 attendee") : `${count} ${translate("attendees")}`)
  }
  if (ev.location) parts.push(ev.location)
  else if (ev.calendar) parts.push(ev.calendar)
  return parts.join(' · ')
}

function matchesQuery(ev: CalendarEvent, q: string): boolean {
  const haystack = [
    ev.title,
    ev.location,
    ev.calendar,
    ev.organizer?.name,
    ev.organizer?.email,
    ...ev.attendees.flatMap((a) => [a.name, a.email])
  ]
  return haystack.some((text) => text?.toLowerCase().includes(q))
}

/**
 * Dialog „Neue Meeting-Notiz“: listet laufende und kommende Kalendertermine
 * (aufsteigend nach Beginn); frühere Termine und die Suche über einen größeren
 * Zeitraum werden erst auf Wunsch geladen.
 */
export function MeetingNoteDialog({ onPick, onCancel }: MeetingNoteDialogProps): React.JSX.Element {
  // Bezugszeitpunkt beim Öffnen; bestimmt „läuft“ / „Heute“ / Zeiträume
  const nowRef = useRef(Date.now())
  const [events, setEvents] = useState<Map<string, CalendarEvent>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<CalendarResult['error'] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  // ganztägige Termine (Urlaube, Geburtstage, …) standardmäßig ausblenden
  const [showAllDay, setShowAllDay] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const loadedRanges = useRef(new Set<string>())
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const loadRange = (key: string, fromMs: number, toMs: number): void => {
    if (loadedRanges.current.has(key)) return
    loadedRanges.current.add(key)
    setLoading(true)
    void window.merkzeug.listCalendarEvents(fromMs, toMs).then((result) => {
      setLoading(false)
      if (!result.ok) {
        setError(result.error ?? 'failed')
        setErrorMessage(result.message ?? null)
        return
      }
      setError(null)
      setEvents((prev) => {
        const next = new Map(prev)
        for (const ev of result.events) next.set(eventKey(ev), ev)
        return next
      })
    })
  }

  useEffect(() => {
    // gestern mitladen, damit bereits laufende (auch mehrtägige) Termine dabei sind
    loadRange('upcoming', nowRef.current - 2 * DAY, nowRef.current + UPCOMING_DAYS * DAY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (showPast) loadRange('past', nowRef.current - PAST_DAYS * DAY, nowRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPast])
  useEffect(() => {
    if (searchOpen) {
      loadRange('search', nowRef.current - SEARCH_DAYS * DAY, nowRef.current + SEARCH_DAYS * DAY)
      searchRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen])

  const list = useMemo(() => {
    const now = nowRef.current
    const all = [...events.values()].sort(
      (a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title, 'de')
    )
    const q = query.trim().toLowerCase()
    // eine konkrete Suche zeigt auch ganztägige Treffer
    if (searchOpen && q) return all.filter((ev) => matchesQuery(ev, q))
    return all.filter((ev) => {
      if (ev.allDay && !showAllDay) return false
      const isPast = Date.parse(ev.end) < now
      if (isPast) return showPast && Date.parse(ev.end) >= now - PAST_DAYS * DAY
      return Date.parse(ev.start) <= now + UPCOMING_DAYS * DAY
    })
  }, [events, query, searchOpen, showPast, showAllDay])

  // Auswahl-Index eingrenzen, wenn sich die Liste ändert
  useEffect(() => {
    setActive((prev) => Math.max(0, Math.min(prev, list.length - 1)))
  }, [list])
  // aktive Zeile sichtbar halten
  useEffect(() => {
    listRef.current
      ?.querySelectorAll('.meeting-row')
      [active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((prev) => Math.min(prev + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (list[active]) onPick(list[active])
    }
  }

  const now = nowRef.current
  const rows: React.JSX.Element[] = []
  let lastDay = ''
  list.forEach((ev, index) => {
    const day = dayLabel(ev.start, now)
    if (day !== lastDay) {
      lastDay = day
      rows.push(
        <div key={`day:${localDate(new Date(ev.start))}`} className="meeting-day">
          {day}
        </div>
      )
    }
    const isPast = Date.parse(ev.end) < now
    const isRunning = !isPast && Date.parse(ev.start) <= now
    rows.push(
      <button
        key={eventKey(ev)}
        className={`meeting-row${index === active ? ' active' : ''}${isPast ? ' past' : ''}`}
        onClick={() => onPick(ev)}
        onMouseMove={() => setActive(index)}
      >
        <span className="meeting-time">{meetingTimeLabel(ev)}</span>
        <span className="meeting-main">
          <span className="meeting-title">
            {isRunning && <span className="meeting-now">{translate("in progress")}</span>}
            {ev.title}
          </span>
          {metaLabel(ev) && <span className="meeting-meta">{metaLabel(ev)}</span>}
        </span>
      </button>
    )
  })

  let status: string | null = null
  if (error === 'denied') {
    status =
      translate("Merkzeug cannot access your calendar. Grant access in ") +
      translate("System Settings → Privacy & Security → Calendars, then try again.")
  } else if (error === 'unsupported') {
    status =
      navigator.platform.startsWith('Win')
        ? translate("Classic Outlook was not found. Calendar integration on Windows ") +
          translate("uses the Outlook object model; “new Outlook” does not provide it. ") +
          translate("ICS import is not available yet.")
        : translate("Calendar integration is currently available only on macOS and Windows (classic ") +
          translate("Outlook). ICS import is not available yet.")
  } else if (error === 'failed') {
    status = `${translate("Could not read the calendar.")}${errorMessage ? ` (${errorMessage})` : ''}`
  } else if (loading && list.length === 0) {
    status = navigator.platform.startsWith('Win')
      ? translate("Reading calendars … Outlook will start in the background if needed.")
      : translate("Reading calendars … The system will request permission on first use.")
  } else if (list.length === 0) {
    status =
      searchOpen && query.trim()
        ? translate("No events found.")
        : `${translate("No events in the next")} ${UPCOMING_DAYS} Tagen.`
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog meeting-dialog" onKeyDown={handleKeyDown} tabIndex={-1} ref={(el) => {
        // Fokus auf den Dialog, damit Pfeiltasten/Esc sofort funktionieren
        if (el && !el.contains(document.activeElement)) el.focus()
      }}>
        <div className="meeting-head">
          <h3>{translate("New meeting note")}</h3>
          <button
            className={`meeting-tool${searchOpen ? ' on' : ''}`}
            data-tip={translate("Search events")}
            onClick={() => {
              setSearchOpen((prev) => !prev)
              setQuery('')
            }}
          >
            {translate("Search")}
          </button>
        </div>
        {searchOpen && (
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${translate("Title, person or location — ±")}${SEARCH_DAYS} ${translate("days")}`}
          />
        )}
        <label className="meeting-allday">
          <input
            type="checkbox"
            checked={showAllDay}
            onChange={(e) => setShowAllDay(e.target.checked)}
          />
          {translate("Show all-day events")}
        </label>
        <div className="meeting-list" ref={listRef}>
          {rows}
          {status && <div className="meeting-status">{status}</div>}
        </div>
        <p className="dialog-hint">
          {translate("Select an event to create a note with its title, time, organizer and attendees.")}
        </p>
        <div className="dialog-buttons meeting-foot">
          <button className="meeting-past-toggle" onClick={() => setShowPast((prev) => !prev)}>
            {showPast ? translate("Hide earlier events") : translate("Show earlier events")}
          </button>
          <button onClick={onCancel}>{translate("Cancel")}</button>
        </div>
      </div>
    </div>
  )
}

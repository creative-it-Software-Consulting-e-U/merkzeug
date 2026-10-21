import { useCallback, useEffect, useState } from 'react'
import { t as translate } from '@merkzeug/core/i18n'
import type { CalendarAccess } from '../../../shared/types'

/** Settings: which system calendar meeting notes read, and whether macOS allows access. */
export function SystemCalendar(): React.JSX.Element | null {
  const [access, setAccess] = useState<CalendarAccess | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback((request = false) => {
    setBusy(request)
    void window.merkzeug.calendarAccess(request).then(setAccess).finally(() => setBusy(false))
  }, [])
  useEffect(() => {
    refresh()
    // Nach der Rückkehr aus den Systemeinstellungen den neuen Stand zeigen
    const onFocus = (): void => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  if (!access) return null
  if (access.system === 'outlook') {
    return (
      <div className="system-calendar">
        <h3>{translate("Classic Outlook")}</h3>
        <p className="settings-hint">{translate("New meeting notes list events from classic Outlook, including every account set up there. Outlook starts in the background if needed. The new Outlook is not supported; use calendar sources instead.")}</p>
      </div>
    )
  }
  if (access.system === 'none') {
    return <p className="settings-hint">{translate("No system calendar is connected on Linux. Import ICS files or subscribe to calendar feeds under Calendar sources.")}</p>
  }

  const openSettings = <button onClick={() => void window.merkzeug.openCalendarPrivacy()}>{translate("Open System Settings")}</button>
  return (
    <div className="system-calendar">
      <h3>{translate("macOS Calendar")}</h3>
      {access.state === 'granted' && <>
        <p className="settings-status ok">{translate("Access allowed")}</p>
        <p className="settings-hint">
          {translate("New meeting notes list events from the macOS Calendar app, including every account set up there.")}
          {access.accounts && access.accounts.length > 0 && <> {translate("Accounts:")} {access.accounts.join(', ')}</>}
        </p>
        <div className="settings-row">{openSettings}</div>
      </>}
      {access.state === 'notDetermined' && <>
        <p className="settings-status">{translate("Access not yet allowed")}</p>
        <p className="settings-hint">{translate("Merkzeug can list events from the macOS Calendar app, including every account set up there (iCloud, Exchange, Google …). macOS asks once for permission.")}</p>
        <div className="settings-row"><button disabled={busy} onClick={() => refresh(true)}>{translate("Allow access…")}</button></div>
      </>}
      {(access.state === 'denied' || access.state === 'restricted') && <>
        <p className="settings-status error">{translate("Access turned off")}</p>
        <p className="settings-hint">{translate("Turn on Merkzeug under System Settings → Privacy & Security → Calendars to list events from the macOS Calendar app.")}</p>
        <div className="settings-row">{openSettings}</div>
      </>}
      {access.state === 'failed' && <p className="settings-error">{translate("Could not check calendar access.")}{access.message ? ` (${access.message})` : ''}</p>}
    </div>
  )
}

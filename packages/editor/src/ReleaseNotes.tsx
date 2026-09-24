import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { getLocale, t } from '@merkzeug/core/i18n'
import releases from '../../../website/release-notes.json'
import appPackage from '../../../package.json'
import './releaseNotes.css'

const version = appPackage.version.replace(/\.0$/, '')
export interface ReleaseNotesHost {
  claim(version: string): Promise<boolean>
  seen(version: string): Promise<void>
}
const localHost: ReleaseNotesHost = {
  async claim(v) { return localStorage.getItem('merkzeug.releaseNotesSeen') !== v },
  async seen(v) { localStorage.setItem('merkzeug.releaseNotesSeen', v) }
}
// Share a single request across React StrictMode's effect remount.
let claim: Promise<boolean> | undefined

export function ReleaseNotes({ host = localHost, children }: { host?: ReleaseNotesHost; children?: ReactNode }) {
  const [open, setOpen] = useState<boolean | null>(null)
  useEffect(() => {
    let mounted = true
    claim ??= host.claim(version)
    void claim.then(show => { if (mounted) setOpen(show) }).catch(() => { if (mounted) setOpen(false) })
    return () => { mounted = false }
  }, [host])
  return <>{open === false && children}{open && <ReleaseDialog current onClose={async () => { await host.seen(version); setOpen(false) }} />}</>
}

/** Works inside a separate Help window too; history never changes the seen version. */
export function ReleaseNotesButton() {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Release Notes</button>{open && <ReleaseDialog onClose={async () => setOpen(false)} />}</>
}

function ReleaseDialog({ current = false, onClose }: { current?: boolean; onClose(): Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState(!current)
  const [lang, setLang] = useState<'en' | 'de'>(getLocale().startsWith('de') ? 'de' : 'en')
  const [error, setError] = useState('')
  const close = () => { void onClose().catch(e => setError(String(e))) }
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const siblings = [...document.body.children].filter(el => el !== overlay.current) as HTMLElement[]
    const inert = siblings.map(el => el.inert)
    siblings.forEach(el => { el.inert = true })
    ref.current?.querySelector<HTMLButtonElement>('[data-close-release]')?.focus({ preventScroll: true })
    return () => { siblings.forEach((el, i) => { el.inert = inert[i] }); previousFocus?.focus(); window.dispatchEvent(new Event('merkzeug:release-notes-closed')) }
  }, [])
  const entries = releases.filter(r => history || r.version === version)
  return createPortal(<div ref={overlay} className="merkzeug-release-overlay"><div ref={ref} className="merkzeug-release-notes" role="dialog" aria-modal="true" aria-labelledby="release-notes-title" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    if (e.key === 'Tab') {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, select') ?? [])
      const next = e.shiftKey ? items[items.length - 1] : items[0]
      if (document.activeElement === (e.shiftKey ? items[0] : items[items.length - 1])) { e.preventDefault(); next?.focus() }
    }
  }}>
    <header><h2 id="release-notes-title">{current && !history ? `${t('What’s new', lang)} — Merkzeug ${version}` : 'Release Notes'}</h2>
      <select aria-label={t('Language', lang)} value={lang} onChange={e => setLang(e.target.value as 'en' | 'de')}><option value="en">English</option><option value="de">Deutsch</option></select>
    </header>
    <div className="release-history">{entries.map(r => <article key={r.version}><h3>Merkzeug {r.version}</h3><p>{r.platforms.join(' · ')}{r.date ? ` · ${r.date}` : ''}</p><ul>{r.highlights[lang].map(text => <li key={text}>{text}</li>)}</ul></article>)}</div>
    {error && <p role="alert">{error}</p>}
    <footer>{!history && <button onClick={() => setHistory(true)}>{t('Complete release history', lang)}</button>}<button data-close-release aria-label={t('Close release notes', lang)} onClick={close}>{t('Done', lang)}</button></footer>
  </div></div>, document.body)
}

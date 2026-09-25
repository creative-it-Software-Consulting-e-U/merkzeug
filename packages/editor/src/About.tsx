import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { getLocale, t } from '@merkzeug/core/i18n'
import appPackage from '../../../package.json'
import './releaseNotes.css'

export function AboutButton({ openUrl }: { openUrl(url: string): void }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>{t('About Merkzeug')}</button>{open && <AboutDialog openUrl={openUrl} onClose={() => setOpen(false)} />}</>
}

function AboutDialog({ openUrl, onClose }: { openUrl(url: string): void; onClose(): void }) {
  const overlay = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const german = getLocale().startsWith('de')
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const siblings = [...document.body.children].filter(el => el !== overlay.current) as HTMLElement[]
    const states = siblings.map(el => el.inert)
    siblings.forEach(el => { el.inert = true })
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { siblings.forEach((el, i) => { el.inert = states[i] }); previous?.focus() }
  }, [])
  return createPortal(<div className="merkzeug-release-overlay" ref={overlay}><div className="merkzeug-release-notes" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="merkzeug-about-title" onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    if (e.key === 'Tab') {
      const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      if (document.activeElement === (e.shiftKey ? buttons[0] : buttons.at(-1))) { e.preventDefault(); (e.shiftKey ? buttons.at(-1) : buttons[0])?.focus() }
    }
  }}>
    <header><h2 id="merkzeug-about-title">{t('About Merkzeug')}</h2></header>
    <div className="release-history"><p>Merkzeug {appPackage.version}</p><p>© 2026 creative-it Software &amp; Consulting e.U.</p><p>{german ? 'Open Source unter der MIT-Lizenz.' : 'Open source under the MIT License.'}</p></div>
    <footer><button onClick={() => openUrl('https://merkzeug.creative-it.com/')}>Website</button><button onClick={() => openUrl(`https://merkzeug.creative-it.com/license-${german ? 'de' : 'en'}.html`)}>{german ? 'MIT-Lizenz' : 'MIT License'}</button><button onClick={onClose}>{t('Done')}</button></footer>
  </div></div>, document.body)
}

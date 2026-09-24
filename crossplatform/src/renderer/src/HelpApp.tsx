import { ReleaseNotesButton } from '@merkzeug/editor/ReleaseNotes'
import { licenseText } from '@merkzeug/editor/licenseText'
import { t as translate, getLocale } from '@merkzeug/core/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { jumpToFragment } from './util/anchors'
import { isExternalLink, splitFragment } from './util/paths'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

/** Hilfe-Fenster: rendert Help.de.md / Help.en.md schreibgeschützt. */
export function HelpApp(): React.JSX.Element {
  const [lang, setLang] = useState<'de' | 'en'>(getLocale().toLowerCase().startsWith('de') ? 'de' : 'en')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let crepe: Crepe | null = null
    let cancelled = false
    void (async () => {
      const content = (await window.merkzeug.readHelp(lang)) + '\n\n' + licenseText(lang)
      if (cancelled || !rootRef.current) return
      rootRef.current.innerHTML = ''
      crepe = new Crepe({
        root: rootRef.current,
        defaultValue: content,
        features: {
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false,
          [Crepe.Feature.BlockEdit]: false,
          [Crepe.Feature.Toolbar]: false
        }
      })
      await crepe.create()
      if (cancelled) {
        void crepe.destroy()
        return
      }
      crepe.setReadonly(true)
    })()
    return () => {
      cancelled = true
      if (crepe) void crepe.destroy()
    }
  }, [lang])

  // Links in der Hilfe: extern im Browser öffnen, "#anker" springt zur
  // Überschrift (Inhaltsverzeichnis); andere Ziele gibt es hier nicht.
  const handleClickCapture = useCallback((e: React.MouseEvent): void => {
    const link = (e.target as HTMLElement).closest('a')
    if (!link) return
    const href = link.getAttribute('href')
    if (!href) return
    e.preventDefault()
    e.stopPropagation()
    if (isExternalLink(href)) {
      void window.merkzeug.openExternal(href)
      return
    }
    const { path, fragment } = splitFragment(href)
    if (!path && fragment && rootRef.current) jumpToFragment(rootRef.current, fragment)
  }, [])

  return (
    <div className="help-app">
      <div className="help-header">
        <span className="help-title">{translate("Merkzeug Help")}</span>
        <div className="help-lang"><ReleaseNotesButton />
          <button className={lang === 'de' ? 'toggled' : ''} onClick={() => setLang('de')}>
            Deutsch
          </button>
          <button className={lang === 'en' ? 'toggled' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </div>
      <div ref={rootRef} className="help-content" onClickCapture={handleClickCapture} />
    </div>
  )
}

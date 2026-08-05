import { useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

/** Hilfe-Fenster: rendert Help.de.md / Help.en.md schreibgeschützt. */
export function HelpApp(): React.JSX.Element {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let crepe: Crepe | null = null
    let cancelled = false
    void (async () => {
      const content = await window.mynotion.readHelp(lang)
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

  return (
    <div className="help-app">
      <div className="help-header">
        <span className="help-title">MyNotion-Hilfe</span>
        <div className="help-lang">
          <button className={lang === 'de' ? 'toggled' : ''} onClick={() => setLang('de')}>
            Deutsch
          </button>
          <button className={lang === 'en' ? 'toggled' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </div>
      <div ref={rootRef} className="help-content" />
    </div>
  )
}

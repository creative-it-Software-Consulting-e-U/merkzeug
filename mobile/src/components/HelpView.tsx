import { supportUrl } from '@merkzeug/core/support'
import appPackage from '../../package.json'
import { t as translate } from '@merkzeug/core/i18n'
import { useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { isExternalLink } from '../util/paths'
import helpDe from '../help/Help.de.md?raw'
import helpEn from '../help/Help.en.md?raw'

interface HelpViewProps {
  onClose: () => void
}

/** In-App-Hilfe: readonly gerendert mit derselben Engine wie die Notizen. */
export function HelpView({ onClose }: HelpViewProps): React.JSX.Element {
  const [language, setLanguage] = useState<'en' | 'de'>(navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const content = language === 'de' ? helpDe : helpEn
    const crepe = new Crepe({
      root,
      defaultValue: content,
      features: {
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.AI]: false,
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.Toolbar]: false
      }
    })
    let cancelled = false
    void crepe.create().then(() => {
      if (cancelled) return
      crepe.setReadonly(true)
    })
    return () => {
      cancelled = true
      root.innerHTML = ''
      void crepe.destroy()
    }
  }, [language])

  const handleClickCapture = (e: React.MouseEvent): void => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    e.preventDefault()
    e.stopPropagation()
    const href = anchor.getAttribute('href')
    if (href && isExternalLink(href)) window.open(href, '_blank')
  }

  return (
    <div className="help-view">
      <div className="vault-search-bar">
        <div className="topbar-title">{translate("Help")}</div>
        <select aria-label={translate("Help language")} value={language} onChange={e => setLanguage(e.target.value as 'en' | 'de')}><option value="en">English</option><option value="de">Deutsch</option></select>
        <button className="bar-btn" onClick={onClose}>
          {translate("Done")}
        </button>
      </div>
      <button className="link-btn" onClick={() => window.open(supportUrl(language, 'iOS/iPadOS', appPackage.version), '_blank')}>
        {translate("Contact Support…", language)}
      </button>
      <div className="editor-host" onClickCapture={handleClickCapture}>
        <div ref={rootRef} className="editor-root" />
      </div>
    </div>
  )
}

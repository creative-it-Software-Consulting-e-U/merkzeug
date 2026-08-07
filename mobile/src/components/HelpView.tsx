import { useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { isExternalLink } from '../util/paths'
import helpDe from '../help/Help.de.md?raw'
import helpEn from '../help/Help.en.md?raw'

interface HelpViewProps {
  onClose: () => void
}

/** In-App-Hilfe: readonly gerendert mit derselben Engine wie die Notizen. */
export function HelpView({ onClose }: HelpViewProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const content = navigator.language.toLowerCase().startsWith('de') ? helpDe : helpEn
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
  }, [])

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
      <div className="search-bar">
        <div className="topbar-title">Hilfe</div>
        <button className="bar-btn" onClick={onClose}>
          Fertig
        </button>
      </div>
      <div className="editor-host" onClickCapture={handleClickCapture}>
        <div ref={rootRef} className="editor-root" />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

interface LinkDialogProps {
  initialText: string
  onConfirm: (text: string, href: string) => void
  onCancel: () => void
}

/** Dialog für „Link einfügen“ (⌘K): externer Link oder Pfad im Vault. */
export function LinkDialog({ initialText, onConfirm, onCancel }: LinkDialogProps): React.JSX.Element {
  const [text, setText] = useState(initialText)
  const [href, setHref] = useState('')
  const hrefRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    hrefRef.current?.focus()
  }, [])

  const submit = (): void => {
    if (!href.trim()) return
    onConfirm(text.trim(), href.trim())
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="dialog"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter') submit()
        }}
      >
        <h3>Link einfügen</h3>
        <label>
          Text
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Linktext" />
        </label>
        <label>
          Adresse oder Vault-Pfad
          <input
            ref={hrefRef}
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://… oder Ordner/Notiz.md"
          />
        </label>
        <p className="dialog-hint">
          Vault-Pfade: relativ zur Notiz („Unterordner/Notiz.md“), relativ zur Vault-Wurzel
          („/Projekte/Plan.md“) oder absolut. Links auf Ordner öffnen die Ordnerübersicht.
        </p>
        <div className="dialog-buttons">
          <button onClick={onCancel}>Abbrechen</button>
          <button className="primary" onClick={submit} disabled={!href.trim()}>
            Einfügen
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

/** Zoom-Fenster für Mermaid-Diagramme: +/−/0-Tasten, Pinch/Scroll, Esc schließt. */
export function ZoomApp(): React.JSX.Element {
  const [svg, setSvg] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const off = window.mynotion.onZoomSvg((s) => setSvg(s))
    return off
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.close()
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s * 1.25, 10))
      if (e.key === '-') setScale((s) => Math.max(s / 1.25, 0.1))
      if (e.key === '0') {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="zoom-app"
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          setScale((s) => Math.min(Math.max(s * (e.deltaY < 0 ? 1.1 : 0.9), 0.1), 10))
        } else {
          setOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }))
        }
      }}
      onMouseDown={(e) => {
        dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
      }}
      onMouseMove={(e) => {
        if (dragging.current) {
          setOffset({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
        }
      }}
      onMouseUp={() => (dragging.current = null)}
      onMouseLeave={() => (dragging.current = null)}
    >
      <div className="zoom-hint">Zoomen: Pinch, ⌘+Scroll oder +/− · Zurücksetzen: 0 · Schließen: Esc</div>
      {svg && (
        <div
          className="zoom-canvas"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  )
}

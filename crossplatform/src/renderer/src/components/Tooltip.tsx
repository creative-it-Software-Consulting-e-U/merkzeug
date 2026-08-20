import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const SHOW_DELAY_MS = 350

interface TipState {
  text: string
  /** horizontale Mitte des Elements, Tooltip-Oberkante */
  x: number
  y: number
}

/**
 * App-weite Tooltips für Elemente mit `data-tip`. Statt der trägen nativen
 * `title`-Tooltips: erscheint nach kurzer Verzögerung unter dem Element und
 * bleibt am Fensterrand innerhalb des sichtbaren Bereichs. Erfasst per
 * elementFromPoint auch deaktivierte Buttons, die keine Maus-Events feuern.
 */
export function TooltipLayer(): React.JSX.Element | null {
  const [tip, setTip] = useState<TipState | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let currentEl: Element | null = null

    const hide = (): void => {
      if (timer) clearTimeout(timer)
      currentEl = null
      setTip(null)
    }

    const onMove = (e: MouseEvent): void => {
      const el =
        document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tip]') ?? null
      if (el === currentEl) return
      if (timer) clearTimeout(timer)
      setTip(null)
      currentEl = el
      if (!el) return
      timer = setTimeout(() => {
        const text = el.getAttribute('data-tip')
        if (!text || !el.isConnected) return
        const rect = el.getBoundingClientRect()
        setTip({ text, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      }, SHOW_DELAY_MS)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', hide, true)
    document.addEventListener('mouseleave', hide)
    window.addEventListener('blur', hide)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', hide, true)
      document.removeEventListener('mouseleave', hide)
      window.removeEventListener('blur', hide)
    }
  }, [])

  // nach dem Rendern horizontal in den sichtbaren Bereich schieben
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!el || !tip) return
    const width = el.offsetWidth
    const margin = 6
    let left = tip.x - width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    el.style.left = `${left}px`
  }, [tip])

  if (!tip) return null
  return (
    <div ref={tipRef} className="app-tooltip" style={{ top: tip.y }}>
      {tip.text}
    </div>
  )
}

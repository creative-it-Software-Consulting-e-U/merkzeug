import { useEffect, useRef } from 'react'

export interface MenuEntry {
  label: string
  danger?: boolean
  separator?: boolean
  onClick?: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  entries: MenuEntry[]
  onClose: () => void
}

export function ContextMenu({ x, y, entries, onClose }: ContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const close = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`
  }, [x, y])

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {entries.map((entry, i) =>
        entry.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <button
            key={i}
            className={`context-menu-item${entry.danger ? ' danger' : ''}`}
            onClick={() => {
              onClose()
              entry.onClick?.()
            }}
          >
            {entry.label}
          </button>
        )
      )}
    </div>
  )
}

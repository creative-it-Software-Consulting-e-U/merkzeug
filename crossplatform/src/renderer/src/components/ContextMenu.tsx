import { useEffect, useRef, useState } from 'react'

export interface MenuEntry {
  label: string
  danger?: boolean
  separator?: boolean
  onClick?: () => void
  submenu?: MenuEntry[]
}

interface ContextMenuProps {
  x: number
  y: number
  entries: MenuEntry[]
  onClose: () => void
}

interface MenuListProps {
  x: number
  y: number
  entries: MenuEntry[]
  /** Untermenü: bei Platzmangel links statt rechts vom Eintrag öffnen */
  flipX?: number
  onPick: (entry: MenuEntry) => void
  onSubmenu?: (index: number | null, item?: HTMLElement) => void
  menuRef: React.RefObject<HTMLDivElement | null>
}

function MenuList({ x, y, entries, flipX, onPick, onSubmenu, menuRef }: MenuListProps): React.JSX.Element {
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) el.style.left = `${(flipX ?? x) - rect.width}px`
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`
  }, [x, y, flipX, menuRef])

  return (
    <div ref={menuRef} className="context-menu" style={{ left: x, top: y }}>
      {entries.map((entry, i) =>
        entry.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <button
            key={i}
            className={`context-menu-item${entry.danger ? ' danger' : ''}${entry.submenu ? ' has-submenu' : ''}`}
            onMouseEnter={(e) => onSubmenu?.(entry.submenu ? i : null, e.currentTarget)}
            onClick={(e) => (entry.submenu ? onSubmenu?.(i, e.currentTarget) : onPick(entry))}
          >
            {entry.label}
          </button>
        )
      )}
    </div>
  )
}

export function ContextMenu({ x, y, entries, onClose }: ContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  const subRef = useRef<HTMLDivElement | null>(null)
  const [sub, setSub] = useState<{ index: number; rect: DOMRect } | null>(null)

  useEffect(() => {
    const close = (e: MouseEvent): void => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !subRef.current?.contains(target)) onClose()
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

  const pick = (entry: MenuEntry): void => {
    onClose()
    entry.onClick?.()
  }
  const submenu = sub ? entries[sub.index]?.submenu : undefined

  return (
    <>
      <MenuList
        x={x}
        y={y}
        entries={entries}
        menuRef={ref}
        onPick={pick}
        onSubmenu={(index, item) => setSub(index === null || !item ? null : { index, rect: item.getBoundingClientRect() })}
      />
      {sub && submenu && (
        <MenuList
          key={sub.index}
          x={sub.rect.right + 2}
          y={sub.rect.top - 5}
          flipX={sub.rect.left - 2}
          entries={submenu}
          menuRef={subRef}
          onPick={pick}
        />
      )}
    </>
  )
}

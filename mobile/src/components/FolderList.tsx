import { t as translate } from '@merkzeug/core/i18n'
import { useRef } from 'react'
import type { FileNode } from '../vault'

interface FolderListProps {
  node: FileNode | null
  onOpen: (path: string) => void
  /** Long-Press (oder Rechtsklick im Dev-Modus) auf einen Eintrag. */
  onItemMenu?: (node: FileNode) => void
}

const LONG_PRESS_MS = 450

/** Ordnerinhalt als Touch-freundliche Liste: Ordner zuerst, dann Notizen. */
export function FolderList({ node, onOpen, onItemMenu }: FolderListProps): React.JSX.Element {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longPressFired = useRef(false)

  const cancelPress = (): void => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
    pressStart.current = null
  }

  const handleTouchStart = (child: FileNode) => (e: React.TouchEvent) => {
    if (!onItemMenu) return
    const t = e.touches[0]
    pressStart.current = { x: t.clientX, y: t.clientY }
    longPressFired.current = false
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true
      pressTimer.current = null
      onItemMenu(child)
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (!pressStart.current) return
    const t = e.touches[0]
    if (
      Math.abs(t.clientX - pressStart.current.x) > 10 ||
      Math.abs(t.clientY - pressStart.current.y) > 10
    ) {
      cancelPress()
    }
  }

  if (!node) return <div className="folder-empty">{translate("Folder not found.")}</div>
  const children = [...(node.children ?? [])].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'de')
  })
  const visible = children.filter(
    (c) => c.isDirectory || c.name.toLowerCase().endsWith('.md')
  )
  if (visible.length === 0) {
    return <div className="folder-empty">{translate("No notes in this folder.")}</div>
  }
  return (
    <ul className="folder-list">
      {visible.map((child) => (
        <li key={child.path}>
          <button
            className="folder-row"
            onClick={() => {
              if (longPressFired.current) {
                longPressFired.current = false
                return
              }
              onOpen(child.path)
            }}
            onTouchStart={handleTouchStart(child)}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            onContextMenu={(e) => {
              if (!onItemMenu) return
              e.preventDefault()
              onItemMenu(child)
            }}
          >
            <span className="folder-row-icon">{child.isDirectory ? '📁' : '📄'}</span>
            <span className="folder-row-name">
              {child.isDirectory ? child.name : child.name.replace(/\.md$/i, '')}
            </span>
            <span className="folder-row-chevron">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

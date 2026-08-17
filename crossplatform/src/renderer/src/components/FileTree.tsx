import { useCallback, useState } from 'react'
import type { FileNode } from '../../../shared/types'
import { ContextMenu, type MenuEntry } from './ContextMenu'

interface FileTreeProps {
  root: FileNode
  expanded: Set<string>
  assetsVisible: boolean
  /** ausgewählte Pfade; Mehrfachauswahl nur für Notizen im selben Ordner */
  selectedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onOpenFile: (path: string) => void
  onOpenFolder: (path: string) => void
  onSelect: (path: string, mode?: 'toggle' | 'range') => void
  onCreateNote: (dir: string) => void
  onCreateFolder: (dir: string) => void
  onRename: (path: string, newName: string) => void
  onTrash: (path: string) => void
  onShowInFolder: (path: string) => void
  onExportPdf: (path: string) => void
  onExportPdfMulti: (paths: string[]) => void
  onMove: (src: string, destDir: string) => void
}

interface MenuState {
  x: number
  y: number
  node: FileNode
}

function isAssetsDir(node: FileNode): boolean {
  return node.isDirectory && node.name.endsWith('.assets')
}

export function FileTree(props: FileTreeProps): React.JSX.Element {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const startRename = useCallback((node: FileNode): void => {
    setRenaming(node.path)
    setRenameValue(node.name.endsWith('.md') ? node.name.slice(0, -3) : node.name)
  }, [])

  const commitRename = useCallback(
    (node: FileNode): void => {
      const value = renameValue.trim()
      setRenaming(null)
      if (!value || value === node.name || (node.name.endsWith('.md') && value === node.name.slice(0, -3))) {
        return
      }
      props.onRename(node.path, node.name.endsWith('.md') ? `${value}.md` : value)
    },
    [props, renameValue]
  )

  const menuEntries = (node: FileNode): MenuEntry[] => {
    // Rechtsklick auf eine Datei der Mehrfachauswahl: Aktionen für alle
    if (props.selectedPaths.size > 1 && props.selectedPaths.has(node.path)) {
      const paths = [...props.selectedPaths]
      return [
        {
          label: `${paths.length} Dateien als PDF exportieren…`,
          onClick: () => props.onExportPdfMulti(paths)
        }
      ]
    }
    const entries: MenuEntry[] = []
    if (node.isDirectory) {
      entries.push(
        { label: 'Neue Notiz', onClick: () => props.onCreateNote(node.path) },
        { label: 'Neuer Ordner', onClick: () => props.onCreateFolder(node.path) },
        { separator: true, label: '' }
      )
    }
    if (!node.isDirectory && node.name.endsWith('.md')) {
      entries.push(
        { label: 'Als PDF exportieren…', onClick: () => props.onExportPdf(node.path) },
        { separator: true, label: '' }
      )
    }
    entries.push(
      { label: 'Umbenennen', onClick: () => startRename(node) },
      { label: 'Im Finder zeigen', onClick: () => props.onShowInFolder(node.path) },
      { separator: true, label: '' },
      { label: 'In den Papierkorb legen', danger: true, onClick: () => props.onTrash(node.path) }
    )
    return entries
  }

  const renderNode = (node: FileNode, depth: number): React.JSX.Element | null => {
    if (!node.isDirectory && !node.name.endsWith('.md')) {
      // Nicht-Markdown-Dateien nur innerhalb sichtbarer Assets-Ordner anzeigen
      const parentIsAssets = node.path.includes('.assets')
      if (!parentIsAssets) return null
    }
    if (isAssetsDir(node) && !props.assetsVisible) return null

    const isExpanded = props.expanded.has(node.path)
    const isSelected = props.selectedPaths.has(node.path)
    const isRenaming = renaming === node.path
    const isDropTarget = dropTarget === node.path

    return (
      <div key={node.path}>
        <div
          className={`tree-row${isSelected ? ' selected' : ''}${isDropTarget ? ' drop-target' : ''}`}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          draggable={!isRenaming}
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-merkzeug-path', node.path)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            if (!node.isDirectory) return
            if (e.dataTransfer.types.includes('application/x-merkzeug-path')) {
              e.preventDefault()
              setDropTarget(node.path)
            }
          }}
          onDragLeave={() => setDropTarget((t) => (t === node.path ? null : t))}
          onDrop={(e) => {
            setDropTarget(null)
            const src = e.dataTransfer.getData('application/x-merkzeug-path')
            if (src && node.isDirectory && src !== node.path) {
              e.preventDefault()
              props.onMove(src, node.path)
            }
          }}
          onClick={(e) => {
            // Mehrfachauswahl (nur Notizen): ⌘/Ctrl-Klick erweitert, ⇧-Klick
            // wählt den Bereich — beides ohne die Datei zu öffnen
            if (!node.isDirectory && node.name.endsWith('.md') && (e.metaKey || e.ctrlKey)) {
              props.onSelect(node.path, 'toggle')
              return
            }
            if (!node.isDirectory && node.name.endsWith('.md') && e.shiftKey) {
              props.onSelect(node.path, 'range')
              return
            }
            props.onSelect(node.path)
            if (node.isDirectory) props.onToggleExpand(node.path)
            else if (node.name.endsWith('.md')) props.onOpenFile(node.path)
            else props.onShowInFolder(node.path)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (node.isDirectory) props.onOpenFolder(node.path)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY, node })
          }}
        >
          <span className="tree-icon">
            {node.isDirectory ? (isExpanded ? '▾' : '▸') : ''}
          </span>
          <span className="tree-glyph">{node.isDirectory ? '📁' : '📄'}</span>
          {isRenaming ? (
            <input
              className="tree-rename-input"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(node)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(node)
                if (e.key === 'Escape') setRenaming(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="tree-label">
              {node.name.endsWith('.md') ? node.name.slice(0, -3) : node.name}
            </span>
          )}
        </div>
        {node.isDirectory && isExpanded && (
          <div>
            {(node.children ?? []).map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="file-tree"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-merkzeug-path')) e.preventDefault()
      }}
      onDrop={(e) => {
        const src = e.dataTransfer.getData('application/x-merkzeug-path')
        if (src && e.target === e.currentTarget) props.onMove(src, props.root.path)
      }}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY, node: props.root })
        }
      }}
    >
      {(props.root.children ?? []).map((child) => renderNode(child, 0))}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          entries={menuEntries(menu.node)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

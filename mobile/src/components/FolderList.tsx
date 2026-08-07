import type { FileNode } from '../vault'

interface FolderListProps {
  node: FileNode | null
  onOpen: (path: string) => void
}

/** Ordnerinhalt als Touch-freundliche Liste: Ordner zuerst, dann Notizen. */
export function FolderList({ node, onOpen }: FolderListProps): React.JSX.Element {
  if (!node) return <div className="folder-empty">Ordner nicht gefunden.</div>
  const children = [...(node.children ?? [])].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'de')
  })
  const visible = children.filter(
    (c) => c.isDirectory || c.name.toLowerCase().endsWith('.md')
  )
  if (visible.length === 0) {
    return <div className="folder-empty">Keine Notizen in diesem Ordner.</div>
  }
  return (
    <ul className="folder-list">
      {visible.map((child) => (
        <li key={child.path}>
          <button className="folder-row" onClick={() => onOpen(child.path)}>
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

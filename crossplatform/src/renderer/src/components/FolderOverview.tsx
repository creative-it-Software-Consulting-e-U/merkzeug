import type { FileNode } from '../../../shared/types'
import { basename } from '../util/paths'

interface FolderOverviewProps {
  folderPath: string
  tree: FileNode | null
  onOpenNote: (path: string) => void
  onOpenFolder: (path: string) => void
}

function findNode(node: FileNode | null, path: string): FileNode | null {
  if (!node) return null
  if (node.path === path) return node
  if (!node.isDirectory) return null
  for (const child of node.children ?? []) {
    const found = findNode(child, path)
    if (found) return found
  }
  return null
}

function countNotes(node: FileNode): number {
  if (!node.isDirectory) return node.name.endsWith('.md') ? 1 : 0
  return (node.children ?? []).reduce((sum, child) => sum + countNotes(child), 0)
}

/** Datei-Übersicht eines Ordners (wie in der Mac-App bei Ordner-Links). */
export function FolderOverview({
  folderPath,
  tree,
  onOpenNote,
  onOpenFolder
}: FolderOverviewProps): React.JSX.Element {
  const node = findNode(tree, folderPath)
  if (!node) {
    return <div className="folder-overview-empty">Ordner nicht gefunden: {folderPath}</div>
  }
  const children = (node.children ?? []).filter(
    (c) => (c.isDirectory && !c.name.endsWith('.assets')) || c.name.endsWith('.md')
  )
  return (
    <div className="folder-overview">
      <h1>📁 {basename(folderPath)}</h1>
      {children.length === 0 && <p className="folder-overview-empty">Dieser Ordner ist leer.</p>}
      <div className="folder-grid">
        {children.map((child) => (
          <button
            key={child.path}
            className="folder-card"
            onClick={() =>
              child.isDirectory ? onOpenFolder(child.path) : onOpenNote(child.path)
            }
          >
            <span className="folder-card-icon">{child.isDirectory ? '📁' : '📄'}</span>
            <span className="folder-card-name">
              {child.isDirectory ? child.name : basename(child.name, '.md')}
            </span>
            {child.isDirectory && (
              <span className="folder-card-meta">{countNotes(child)} Notizen</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

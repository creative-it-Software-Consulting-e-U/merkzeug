import type { FileNode, GitStatus } from '../../../shared/types'
import { basename } from '../util/paths'
import { FileTree } from './FileTree'
import { GitBar } from './GitBar'
import { IconEye, IconNewFolder, IconNewNote, IconReload } from './icons'

interface SidebarProps {
  vault: string
  tree: FileNode | null
  expanded: Set<string>
  assetsVisible: boolean
  selectedPath: string | null
  gitStatus: GitStatus | null
  gitBusy: boolean
  onToggleExpand: (path: string) => void
  onOpenFile: (path: string) => void
  onOpenFolder: (path: string) => void
  onSelect: (path: string) => void
  onCreateNote: (dir: string) => void
  onCreateFolder: (dir: string) => void
  onRename: (path: string, newName: string) => void
  onTrash: (path: string) => void
  onShowInFolder: (path: string) => void
  onMove: (src: string, destDir: string) => void
  onNewNote: () => void
  onNewFolder: () => void
  onReload: () => void
  onToggleAssets: () => void
  onGitCommitPush: (message: string) => void
  onGitPull: () => void
}

export function Sidebar(props: SidebarProps): React.JSX.Element {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-vault-name" title={props.vault}>
          {basename(props.vault)}
        </span>
      </div>
      <div className="sidebar-tree">
        {props.tree && (
          <FileTree
            root={props.tree}
            expanded={props.expanded}
            assetsVisible={props.assetsVisible}
            selectedPath={props.selectedPath}
            onToggleExpand={props.onToggleExpand}
            onOpenFile={props.onOpenFile}
            onOpenFolder={props.onOpenFolder}
            onSelect={props.onSelect}
            onCreateNote={props.onCreateNote}
            onCreateFolder={props.onCreateFolder}
            onRename={props.onRename}
            onTrash={props.onTrash}
            onShowInFolder={props.onShowInFolder}
            onMove={props.onMove}
          />
        )}
      </div>
      <GitBar
        status={props.gitStatus}
        busy={props.gitBusy}
        onCommitPush={props.onGitCommitPush}
        onPull={props.onGitPull}
      />
      <div className="sidebar-footer">
        <button className="toolbar-btn icon" title="Neue Notiz (⌘N)" onClick={props.onNewNote}>
          <IconNewNote />
        </button>
        <button
          className="toolbar-btn icon"
          title="Neuer Ordner (⇧⌘N)"
          onClick={props.onNewFolder}
        >
          <IconNewFolder />
        </button>
        <div className="toolbar-spacer" />
        <button className="toolbar-btn icon" title="Neu einlesen" onClick={props.onReload}>
          <IconReload />
        </button>
        <button
          className="toolbar-btn icon"
          title={
            props.assetsVisible
              ? 'Ressourcen ausblenden (⇧⌘R)'
              : 'Ressourcen einblenden (⇧⌘R)'
          }
          onClick={props.onToggleAssets}
        >
          <IconEye open={props.assetsVisible} />
        </button>
      </div>
    </div>
  )
}

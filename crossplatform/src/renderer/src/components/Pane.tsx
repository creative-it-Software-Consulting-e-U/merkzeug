import { useState, type RefObject } from 'react'
import type { FileNode } from '../../../shared/types'
import type { Pane as PaneState, Tab } from '../types'
import { ContextMenu, type MenuEntry } from './ContextMenu'
import { Editor, type EditorHandle, type FormatAction } from './Editor'
import { FolderOverview } from './FolderOverview'
import { TabBar } from './TabBar'
import {
  IconBack,
  IconBold,
  IconBook,
  IconHelp,
  IconBulletList,
  IconCaret,
  IconCodeBlock,
  IconForward,
  IconHeading,
  IconHr,
  IconImage,
  IconInlineCode,
  IconItalic,
  IconLink,
  IconOrderedList,
  IconQuote,
  IconStrike,
  IconTable
} from './icons'

interface PaneProps {
  pane: PaneState
  paneIndex: number
  isActive: boolean
  tree: FileNode | null
  dirtyTabs: Set<string>
  editorRefs: RefObject<Map<string, EditorHandle | null>>
  onActivatePane: () => void
  onActivateTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onDropTab: (tabId: string, fromPane: number) => void
  onLinkClick: (tab: Tab, href: string) => void
  onOverviewOpenNote: (tab: Tab, path: string) => void
  onOverviewOpenFolder: (tab: Tab, path: string) => void
  onToggleNavMode: (tabId: string) => void
  onNavBack: (tabId: string) => void
  onNavForward: (tabId: string) => void
  onInsertLink: () => void
  onDirtyChange: (tabId: string, dirty: boolean) => void
  onEditorSaved: (tabId: string, markdown: string) => void
}

interface ToolbarMenu {
  kind: 'heading' | 'table'
  x: number
  y: number
}

export function PaneView(props: PaneProps): React.JSX.Element {
  const { pane, paneIndex } = props
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) ?? null
  const [menu, setMenu] = useState<ToolbarMenu | null>(null)

  const editor = (): EditorHandle | null =>
    activeTab ? (props.editorRefs.current?.get(activeTab.id) ?? null) : null

  const format = (action: FormatAction): void => editor()?.format(action)

  const openMenu = (kind: ToolbarMenu['kind'], e: React.MouseEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ kind, x: rect.left, y: rect.bottom + 4 })
  }

  const headingEntries: MenuEntry[] = [
    { label: 'Text', onClick: () => format('text') },
    { label: 'Überschrift 1', onClick: () => format('h1') },
    { label: 'Überschrift 2', onClick: () => format('h2') },
    { label: 'Überschrift 3', onClick: () => format('h3') }
  ]

  const tableEntries: MenuEntry[] = [
    { label: 'Tabelle einfügen (3×3)', onClick: () => editor()?.insertTable(3, 3) },
    { label: 'Tabelle einfügen (2×2)', onClick: () => editor()?.insertTable(2, 2) },
    { label: '', separator: true },
    { label: 'Zeile darunter einfügen', onClick: () => editor()?.tableCommand('rowBelow') },
    { label: 'Zeile darüber einfügen', onClick: () => editor()?.tableCommand('rowAbove') },
    { label: 'Spalte rechts einfügen', onClick: () => editor()?.tableCommand('colAfter') },
    { label: 'Spalte links einfügen', onClick: () => editor()?.tableCommand('colBefore') },
    { label: '', separator: true },
    { label: 'Zeile löschen', onClick: () => editor()?.tableCommand('deleteRow') },
    { label: 'Spalte löschen', onClick: () => editor()?.tableCommand('deleteCol') }
  ]

  const fmtBtn = (
    title: string,
    icon: React.JSX.Element,
    onClick: (e: React.MouseEvent) => void,
    extraClass = ''
  ): React.JSX.Element => (
    <button
      className={`toolbar-btn icon${extraClass ? ` ${extraClass}` : ''}`}
      title={title}
      disabled={activeTab?.navMode}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  )

  return (
    <div
      className={`pane${props.isActive ? ' active-pane' : ''}`}
      onMouseDownCapture={props.onActivatePane}
    >
      <TabBar
        tabs={pane.tabs}
        activeTabId={pane.activeTabId}
        paneIndex={paneIndex}
        dirtyTabs={props.dirtyTabs}
        onActivate={props.onActivateTab}
        onClose={props.onCloseTab}
        onDropTab={props.onDropTab}
      />
      {activeTab && (
        <div className="pane-toolbar">
          <button
            className="toolbar-btn icon"
            title="Zurück (⌘[)"
            disabled={!activeTab.navMode || activeTab.historyIndex <= 0}
            onClick={() => props.onNavBack(activeTab.id)}
          >
            <IconBack />
          </button>
          <button
            className="toolbar-btn icon"
            title="Vorwärts (⌘])"
            disabled={!activeTab.navMode || activeTab.historyIndex >= activeTab.history.length - 1}
            onClick={() => props.onNavForward(activeTab.id)}
          >
            <IconForward />
          </button>
          {activeTab.kind === 'note' && (
            <>
              <div className="toolbar-divider" />
              {fmtBtn(
                'Absatzformat',
                <>
                  <IconHeading />
                  <IconCaret />
                </>,
                (e) => openMenu('heading', e)
              )}
              <div className="toolbar-divider" />
              {fmtBtn('Fett (⌘B)', <IconBold />, () => format('bold'))}
              {fmtBtn('Kursiv (⌘I)', <IconItalic />, () => format('italic'))}
              {fmtBtn('Durchgestrichen (⌥⌘X)', <IconStrike />, () => format('strike'))}
              {fmtBtn('Inline-Code (⌘E)', <IconInlineCode />, () => format('inlineCode'))}
              <div className="toolbar-divider" />
              {fmtBtn('Aufzählung (⌥⌘8)', <IconBulletList />, () => format('bulletList'))}
              {fmtBtn('Nummerierte Liste (⌥⌘7)', <IconOrderedList />, () => format('orderedList'))}
              {fmtBtn('Zitat (⇧⌘B)', <IconQuote />, () => format('quote'))}
              {fmtBtn('Codeblock (⌥⌘C)', <IconCodeBlock />, () => format('codeBlock'))}
              <div className="toolbar-divider" />
              {fmtBtn('Link einfügen (⌘K)', <IconLink />, () => props.onInsertLink())}
              {fmtBtn('Bild einfügen', <IconImage />, () => editor()?.openImagePicker())}
              {fmtBtn(
                'Tabelle',
                <>
                  <IconTable />
                  <IconCaret />
                </>,
                (e) => openMenu('table', e)
              )}
              {fmtBtn('Trennlinie', <IconHr />, () => format('hr'))}
            </>
          )}
          <div className="toolbar-spacer" />
          <button
            className="toolbar-btn icon"
            title="Merkzeug-Hilfe (⌘?)"
            onClick={() => void window.merkzeug.openHelp()}
          >
            <IconHelp />
          </button>
          <button
            className={`toolbar-btn icon${activeTab.navMode ? ' toggled' : ''}`}
            title={
              activeTab.navMode
                ? 'Navigationsmodus verlassen (⌘R)'
                : 'Navigationsmodus: read-only, Links öffnen im selben Tab (⌘R)'
            }
            onClick={() => props.onToggleNavMode(activeTab.id)}
          >
            <IconBook filled={activeTab.navMode} />
          </button>
          {menu && (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              entries={menu.kind === 'heading' ? headingEntries : tableEntries}
              onClose={() => setMenu(null)}
            />
          )}
        </div>
      )}
      <div className="pane-content">
        {pane.tabs.length === 0 && (
          <div className="pane-empty">
            <p>Keine Notiz geöffnet.</p>
            <p className="pane-empty-hint">Wähle links eine Notiz oder erstelle mit ⌘N eine neue.</p>
          </div>
        )}
        {pane.tabs.map((tab) => {
          const visible = tab.id === pane.activeTabId
          return (
            <div key={tab.id} className="tab-content" style={{ display: visible ? 'flex' : 'none' }}>
              {tab.kind === 'note' ? (
                <Editor
                  ref={(handle) => {
                    props.editorRefs.current?.set(tab.id, handle)
                  }}
                  filePath={tab.path}
                  loadToken={tab.loadToken}
                  readonly={tab.navMode}
                  onLinkClick={(href) => props.onLinkClick(tab, href)}
                  onDirtyChange={(dirty) => props.onDirtyChange(tab.id, dirty)}
                  onSaved={(markdown) => props.onEditorSaved(tab.id, markdown)}
                />
              ) : (
                <FolderOverview
                  folderPath={tab.path}
                  tree={props.tree}
                  onOpenNote={(path) => props.onOverviewOpenNote(tab, path)}
                  onOpenFolder={(path) => props.onOverviewOpenFolder(tab, path)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

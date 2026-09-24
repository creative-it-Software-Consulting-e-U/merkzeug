import { translate } from '../translate'
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
  IconTable,
  IconToc
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
  kind: 'heading' | 'table' | 'toc'
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
    { label: translate("Heading 1"), onClick: () => format('h1') },
    { label: translate("Heading 2"), onClick: () => format('h2') },
    { label: translate("Heading 3"), onClick: () => format('h3') }
  ]

  /** Einträge des Inhaltsverzeichnis-Dropdowns, beim Öffnen aus dem Dokument gelesen. */
  const tocEntries = (): MenuEntry[] => {
    const headings = editor()?.getHeadings() ?? []
    if (headings.length === 0) return [{ label: translate("No headings in this document") }]
    return headings.map((h) => ({
      // Einrückung je Ebene über Geviert-Leerzeichen
      label: '\u2003'.repeat(Math.max(0, h.level - 1)) + h.text,
      onClick: () => editor()?.jumpToHeading(h.id || h.text)
    }))
  }

  const tableEntries: MenuEntry[] = [
    { label: translate("Insert table (3×3)"), onClick: () => editor()?.insertTable(3, 3) },
    { label: translate("Insert table (2×2)"), onClick: () => editor()?.insertTable(2, 2) },
    { label: '', separator: true },
    { label: translate("Insert Row Below"), onClick: () => editor()?.tableCommand('rowBelow') },
    { label: translate("Insert Row Above"), onClick: () => editor()?.tableCommand('rowAbove') },
    { label: translate("Insert column to the right"), onClick: () => editor()?.tableCommand('colAfter') },
    { label: translate("Insert column to the left"), onClick: () => editor()?.tableCommand('colBefore') },
    { label: '', separator: true },
    { label: translate("Delete Row"), onClick: () => editor()?.tableCommand('deleteRow') },
    { label: translate("Delete Column"), onClick: () => editor()?.tableCommand('deleteCol') }
  ]

  const fmtBtn = (
    title: string,
    icon: React.JSX.Element,
    onClick: (e: React.MouseEvent) => void,
    extraClass = ''
  ): React.JSX.Element => (
    <button
      className={`toolbar-btn icon${extraClass ? ` ${extraClass}` : ''}`}
      data-tip={title}
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
            data-tip={translate("Back (⌘[)")}
            disabled={!activeTab.navMode || activeTab.historyIndex <= 0}
            onClick={() => props.onNavBack(activeTab.id)}
          >
            <IconBack />
          </button>
          <button
            className="toolbar-btn icon"
            data-tip={translate("Forward (⌘])")}
            disabled={!activeTab.navMode || activeTab.historyIndex >= activeTab.history.length - 1}
            onClick={() => props.onNavForward(activeTab.id)}
          >
            <IconForward />
          </button>
          {activeTab.kind === 'note' && (
            <>
              <div className="toolbar-divider" />
              <button
                className="toolbar-btn icon"
                data-tip={translate("Table of contents: jump to a heading")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => openMenu('toc', e)}
              >
                <IconToc />
                <IconCaret />
              </button>
              <div className="toolbar-divider" />
              {fmtBtn(
                translate("Paragraph style"),
                <>
                  <IconHeading />
                  <IconCaret />
                </>,
                (e) => openMenu('heading', e)
              )}
              <div className="toolbar-divider" />
              {fmtBtn(translate("Bold (⌘B)"), <IconBold />, () => format('bold'))}
              {fmtBtn(translate("Italic (⌘I)"), <IconItalic />, () => format('italic'))}
              {fmtBtn(translate("Strikethrough (⌥⌘X)"), <IconStrike />, () => format('strike'))}
              {fmtBtn(translate("Inline code (⌘E)"), <IconInlineCode />, () => format('inlineCode'))}
              <div className="toolbar-divider" />
              {fmtBtn(translate("Bullet list (⌥⌘8)"), <IconBulletList />, () => format('bulletList'))}
              {fmtBtn(translate("Numbered list (⌥⌘7)"), <IconOrderedList />, () => format('orderedList'))}
              {fmtBtn(translate("Quote (⇧⌘B)"), <IconQuote />, () => format('quote'))}
              {fmtBtn(translate("Code block (⌥⌘C)"), <IconCodeBlock />, () => format('codeBlock'))}
              <div className="toolbar-divider" />
              {fmtBtn(translate("Insert link (⌘K)"), <IconLink />, () => props.onInsertLink())}
              {fmtBtn(translate("Insert image"), <IconImage />, () => editor()?.openImagePicker())}
              {fmtBtn(
                translate("Table"),
                <>
                  <IconTable />
                  <IconCaret />
                </>,
                (e) => openMenu('table', e)
              )}
              {fmtBtn(translate("Divider"), <IconHr />, () => format('hr'))}
            </>
          )}
          <div className="toolbar-spacer" />
          <button
            className="toolbar-btn icon"
            data-tip={translate("Merkzeug Help (⌘?)")}
            onClick={() => void window.merkzeug.openHelp()}
          >
            <IconHelp />
          </button>
          <button
            className={`toolbar-btn icon${activeTab.navMode ? ' toggled' : ''}`}
            data-tour="reading-mode"
            data-tip={
              activeTab.navMode
                ? translate("Exit navigation mode (⌘R)")
                : translate("Navigation mode: read-only, links open in the same tab (⌘R)")
            }
            onClick={() => props.onToggleNavMode(activeTab.id)}
          >
            <IconBook filled={activeTab.navMode} />
          </button>
          {menu && (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              entries={
                menu.kind === 'heading'
                  ? headingEntries
                  : menu.kind === 'table'
                    ? tableEntries
                    : tocEntries()
              }
              onClose={() => setMenu(null)}
            />
          )}
        </div>
      )}
      <div className="pane-content">
        {pane.tabs.length === 0 && (
          <div className="pane-empty">
            <p>{translate("No note is open.")}</p>
            <p className="pane-empty-hint">{translate("Select a note on the left or create one with ⌘N.")}</p>
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
                  jump={tab.pendingJump}
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

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileNode, GitStatus, MenuAction } from '../../shared/types'
import { makeTab, type Pane, type Tab, type TabKind } from './types'
import { basename, dirname, extname, isExternalLink, resolveVaultLink } from './util/paths'
import type { EditorHandle } from './components/Editor'
import { PaneView } from './components/Pane'
import { Sidebar } from './components/Sidebar'
import { LinkDialog } from './components/LinkDialog'

const emptyPane = (): Pane => ({ tabs: [], activeTabId: null })

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

export function App(): React.JSX.Element {
  const [vault, setVault] = useState<string | null>(null)
  const [vaultMissing, setVaultMissing] = useState(false)
  const [recents, setRecents] = useState<string[]>([])
  const [tree, setTree] = useState<FileNode | null>(null)
  const [panes, setPanes] = useState<[Pane, Pane]>([emptyPane(), emptyPane()])
  const [split, setSplit] = useState(false)
  const [activePane, setActivePane] = useState<0 | 1>(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [assetsVisible, setAssetsVisible] = useState(false)
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [gitBusy, setGitBusy] = useState(false)
  const [gitMessage, setGitMessage] = useState<string | null>(null)
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set())
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const editorRefs = useRef<Map<string, EditorHandle | null>>(new Map())
  const vaultRef = useRef<string | null>(null)
  vaultRef.current = vault
  const panesRef = useRef(panes)
  panesRef.current = panes
  const activePaneRef = useRef(activePane)
  activePaneRef.current = activePane
  const splitRef = useRef(split)
  splitRef.current = split
  const selectedRef = useRef(selectedPath)
  selectedRef.current = selectedPath
  const treeRef = useRef(tree)
  treeRef.current = tree

  const refreshTree = useCallback(async (v?: string | null): Promise<FileNode | null> => {
    const target = v ?? vaultRef.current
    if (!target) return null
    const t = await window.mynotion.readTree(target)
    setTree(t)
    return t
  }, [])

  const refreshGit = useCallback(async (v?: string | null): Promise<void> => {
    const target = v ?? vaultRef.current
    if (!target) return
    try {
      setGitStatus(await window.mynotion.gitStatus(target))
    } catch {
      setGitStatus(null)
    }
  }, [])

  const activeEditor = useCallback((): EditorHandle | null => {
    const pane = panesRef.current[activePaneRef.current]
    if (!pane.activeTabId) return null
    return editorRefs.current.get(pane.activeTabId) ?? null
  }, [])

  const activeTab = useCallback((): Tab | null => {
    const pane = panesRef.current[activePaneRef.current]
    return pane.tabs.find((t) => t.id === pane.activeTabId) ?? null
  }, [])

  const updateTab = useCallback((tabId: string, update: (tab: Tab) => Tab): void => {
    setPanes((prev) => {
      const next = prev.map((pane) => ({
        ...pane,
        tabs: pane.tabs.map((t) => (t.id === tabId ? update(t) : t))
      })) as [Pane, Pane]
      return next
    })
  }, [])

  /** Öffnet Notiz oder Ordner in einem neuen Tab (oder aktiviert vorhandenen Tab). */
  const openInNewTab = useCallback((path: string, kind: TabKind, paneIndex?: number): void => {
    const pi = (paneIndex ?? activePaneRef.current) as 0 | 1
    setPanes((prev) => {
      const pane = prev[pi]
      const existing = pane.tabs.find((t) => t.path === path && t.kind === kind)
      if (existing) {
        const next = [...prev] as [Pane, Pane]
        next[pi] = { ...pane, activeTabId: existing.id }
        return next
      }
      const tab = makeTab(path, kind)
      const next = [...prev] as [Pane, Pane]
      next[pi] = { tabs: [...pane.tabs, tab], activeTabId: tab.id }
      return next
    })
  }, [])

  /** Navigation im selben Tab (Navigationsmodus / Ordnerübersicht). */
  const navigateTab = useCallback(
    (tabId: string, path: string, kind: TabKind): void => {
      const editor = editorRefs.current.get(tabId)
      void editor?.flush()
      updateTab(tabId, (tab) => ({
        ...tab,
        path,
        kind,
        history: [...tab.history.slice(0, tab.historyIndex + 1), path],
        historyIndex: tab.historyIndex + 1,
        loadToken: tab.loadToken + 1
      }))
    },
    [updateTab]
  )

  const expandFolder = useCallback((path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const v = vaultRef.current
      // alle Eltern-Ordner bis zur Vault-Wurzel aufklappen
      let current = path
      while (v && current.length >= v.length) {
        next.add(current)
        const parent = dirname(current)
        if (parent === current) break
        current = parent
      }
      return next
    })
  }, [])

  const openFolderOverview = useCallback(
    (path: string, sameTab?: Tab): void => {
      expandFolder(path)
      if (sameTab) navigateTab(sameTab.id, path, 'folder')
      else openInNewTab(path, 'folder')
    },
    [expandFolder, navigateTab, openInNewTab]
  )

  /** Zentrale Link-Auflösung für Editor-Klicks. */
  const handleLinkClick = useCallback(
    (tab: Tab, href: string): void => {
      if (isExternalLink(href)) {
        void window.mynotion.openExternal(href)
        return
      }
      const v = vaultRef.current
      if (!v) return
      const candidates = resolveVaultLink(href, tab.path, v)
      void (async () => {
        for (const candidate of candidates) {
          const withMd = extname(candidate) ? candidate : `${candidate}.md`
          for (const target of [candidate, withMd]) {
            const node = findNode(treeRef.current, target)
            const exists = node !== null || (await window.mynotion.fileExists(target))
            if (!exists) continue
            const isDir = node ? node.isDirectory : !extname(target)
            if (isDir) {
              openFolderOverview(target, tab.navMode ? tab : undefined)
            } else if (target.endsWith('.md')) {
              if (tab.navMode) navigateTab(tab.id, target, 'note')
              else openInNewTab(target, 'note')
            } else {
              void window.mynotion.showInFolder(target)
            }
            return
          }
        }
      })()
    },
    [navigateTab, openFolderOverview, openInNewTab]
  )

  const closeTab = useCallback((tabId: string): void => {
    const editor = editorRefs.current.get(tabId)
    editor?.flushSync()
    editorRefs.current.delete(tabId)
    setDirtyTabs((prev) => {
      if (!prev.has(tabId)) return prev
      const next = new Set(prev)
      next.delete(tabId)
      return next
    })
    setPanes((prev) => {
      const next = prev.map((pane) => {
        const idx = pane.tabs.findIndex((t) => t.id === tabId)
        if (idx === -1) return pane
        const tabs = pane.tabs.filter((t) => t.id !== tabId)
        let activeTabId = pane.activeTabId
        if (activeTabId === tabId) {
          activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null
        }
        return { tabs, activeTabId }
      }) as [Pane, Pane]
      return next
    })
  }, [])

  const moveTabToOtherPane = useCallback((tabId: string, fromPane: number): void => {
    setSplit(true)
    setPanes((prev) => {
      const from = prev[fromPane]
      const tab = from.tabs.find((t) => t.id === tabId)
      if (!tab) return prev
      const toIndex = fromPane === 0 ? 1 : 0
      const to = prev[toIndex]
      const next = [...prev] as [Pane, Pane]
      const remaining = from.tabs.filter((t) => t.id !== tabId)
      next[fromPane] = {
        tabs: remaining,
        activeTabId:
          from.activeTabId === tabId ? remaining[0]?.id ?? null : from.activeTabId
      }
      next[toIndex] = { tabs: [...to.tabs, tab], activeTabId: tab.id }
      return next
    })
  }, [])

  const handleCreateNote = useCallback(
    async (dir: string): Promise<void> => {
      const path = await window.mynotion.createNote(dir)
      await refreshTree()
      expandFolder(dir)
      openInNewTab(path, 'note')
      setSelectedPath(path)
    },
    [expandFolder, openInNewTab, refreshTree]
  )

  const handleCreateFolder = useCallback(
    async (dir: string): Promise<void> => {
      const path = await window.mynotion.createFolder(dir)
      await refreshTree()
      expandFolder(path)
      setSelectedPath(path)
    },
    [expandFolder, refreshTree]
  )

  /** Neue Notiz/neuer Ordner im Ordner der aktuellen Auswahl (sonst Vault-Wurzel). */
  const createAtSelection = useCallback(
    (kind: 'note' | 'folder'): void => {
      const v = vaultRef.current
      if (!v) return
      const sel = selectedRef.current
      const node = sel ? findNode(treeRef.current, sel) : null
      const dir = node ? (node.isDirectory ? node.path : dirname(node.path)) : v
      if (kind === 'note') void handleCreateNote(dir)
      else void handleCreateFolder(dir)
    },
    [handleCreateFolder, handleCreateNote]
  )

  const handleRename = useCallback(
    async (path: string, newName: string): Promise<void> => {
      try {
        const newPath = await window.mynotion.renamePath(path, newName)
        setPanes((prev) => {
          const mapPath = (p: string): string =>
            p === path ? newPath : p.startsWith(`${path}/`) ? newPath + p.slice(path.length) : p
          return prev.map((pane) => ({
            ...pane,
            tabs: pane.tabs.map((t) => ({ ...t, path: mapPath(t.path) }))
          })) as [Pane, Pane]
        })
        await refreshTree()
      } catch (err) {
        alert(String(err))
      }
    },
    [refreshTree]
  )

  const handleMove = useCallback(
    async (src: string, destDir: string): Promise<void> => {
      try {
        const newPath = await window.mynotion.movePath(src, destDir)
        setPanes((prev) => {
          const mapPath = (p: string): string =>
            p === src ? newPath : p.startsWith(`${src}/`) ? newPath + p.slice(src.length) : p
          return prev.map((pane) => ({
            ...pane,
            tabs: pane.tabs.map((t) => ({ ...t, path: mapPath(t.path) }))
          })) as [Pane, Pane]
        })
        await refreshTree()
      } catch (err) {
        alert(String(err))
      }
    },
    [refreshTree]
  )

  const handleTrash = useCallback(
    async (path: string): Promise<void> => {
      await window.mynotion.trashPath(path)
      // betroffene Tabs schließen
      for (const pane of panesRef.current) {
        for (const tab of pane.tabs) {
          if (tab.path === path || tab.path.startsWith(`${path}/`)) closeTab(tab.id)
        }
      }
      await refreshTree()
    },
    [closeTab, refreshTree]
  )

  const handleGitCommitPush = useCallback(
    async (message: string): Promise<void> => {
      const v = vaultRef.current
      if (!v) return
      setGitBusy(true)
      setGitMessage(null)
      // offene Änderungen erst speichern
      for (const handle of editorRefs.current.values()) await handle?.flush()
      const result = await window.mynotion.gitCommitPush(v, message)
      setGitBusy(false)
      setGitMessage(result.ok ? 'Commit & Push erfolgreich.' : `Fehler: ${result.output}`)
      await refreshGit()
    },
    [refreshGit]
  )

  const handleGitPull = useCallback(async (): Promise<void> => {
    const v = vaultRef.current
    if (!v) return
    setGitBusy(true)
    setGitMessage(null)
    const result = await window.mynotion.gitPull(v)
    setGitBusy(false)
    setGitMessage(result.ok ? 'Pull erfolgreich.' : `Fehler: ${result.output}`)
    await refreshTree()
    await refreshGit()
  }, [refreshGit, refreshTree])

  const insertLinkFromDialog = useCallback(
    (text: string, href: string): void => {
      setLinkDialogOpen(false)
      const editor = activeEditor()
      if (!editor) return
      // Vault-Pfade mit Leerzeichen URL-codieren, externe Links unverändert
      const finalHref = isExternalLink(href) ? href : encodeURI(href)
      editor.insertLink(text || href, finalHref)
    },
    [activeEditor]
  )

  /** Vault initial laden bzw. wechseln */
  const loadVault = useCallback(
    async (v: string): Promise<void> => {
      // alle offenen Editoren speichern und Tabs schließen
      for (const handle of editorRefs.current.values()) handle?.flushSync()
      editorRefs.current.clear()
      setPanes([emptyPane(), emptyPane()])
      setDirtyTabs(new Set())
      setVault(v)
      setVaultMissing(false)
      setSelectedPath(null)
      const storedExpanded = localStorage.getItem(`expanded:${v}`)
      setExpanded(storedExpanded ? new Set(JSON.parse(storedExpanded)) : new Set([v]))
      setAssetsVisible(localStorage.getItem(`assetsVisible:${v}`) === 'true')
      setSplit(localStorage.getItem(`split:${v}`) === 'true')
      await window.mynotion.setTitle(`MyNotion — ${basename(v)}`)
      await refreshTree(v)
      await refreshGit(v)
    },
    [refreshGit, refreshTree]
  )

  // Initialisierung
  useEffect(() => {
    void (async () => {
      const initial = await window.mynotion.getInitialVault()
      if (initial) await loadVault(initial)
      else {
        setVaultMissing(true)
        setRecents(await window.mynotion.getRecentVaults())
      }
    })()
    const offVaultSet = window.mynotion.onVaultSet((v) => void loadVault(v))
    const offChanged = window.mynotion.onVaultChanged(() => {
      void refreshTree()
      void refreshGit()
    })
    return () => {
      offVaultSet()
      offChanged()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Git-Status regelmäßig aktualisieren
  useEffect(() => {
    const interval = setInterval(() => void refreshGit(), 10_000)
    return () => clearInterval(interval)
  }, [refreshGit])

  // UI-Zustand persistieren
  useEffect(() => {
    if (vault) localStorage.setItem(`expanded:${vault}`, JSON.stringify([...expanded]))
  }, [expanded, vault])
  useEffect(() => {
    if (vault) localStorage.setItem(`assetsVisible:${vault}`, String(assetsVisible))
  }, [assetsVisible, vault])
  useEffect(() => {
    if (vault) localStorage.setItem(`split:${vault}`, String(split))
  }, [split, vault])

  // Menü-Aktionen
  useEffect(() => {
    const off = window.mynotion.onMenuAction((action: MenuAction) => {
      switch (action) {
        case 'newNote':
          createAtSelection('note')
          break
        case 'newFolder':
          createAtSelection('folder')
          break
        case 'saveNote':
          void activeEditor()?.flush()
          break
        case 'saveAll':
          for (const handle of editorRefs.current.values()) void handle?.flush()
          break
        case 'closeTab': {
          const tab = activeTab()
          if (tab) closeTab(tab.id)
          else void window.mynotion.closeWindow()
          break
        }
        case 'undo':
          if (activeEditor()) activeEditor()?.undo()
          else document.execCommand('undo')
          break
        case 'redo':
          if (activeEditor()) activeEditor()?.redo()
          else document.execCommand('redo')
          break
        case 'insertLink':
          if (activeTab()?.kind === 'note' && !activeTab()?.navMode) setLinkDialogOpen(true)
          break
        case 'insertImage':
          activeEditor()?.openImagePicker()
          break
        case 'insertTable':
          activeEditor()?.insertTable()
          break
        case 'tableRowAbove':
          activeEditor()?.tableCommand('rowAbove')
          break
        case 'tableRowBelow':
          activeEditor()?.tableCommand('rowBelow')
          break
        case 'tableColBefore':
          activeEditor()?.tableCommand('colBefore')
          break
        case 'tableColAfter':
          activeEditor()?.tableCommand('colAfter')
          break
        case 'tableDeleteRow':
          activeEditor()?.tableCommand('deleteRow')
          break
        case 'tableDeleteCol':
          activeEditor()?.tableCommand('deleteCol')
          break
        case 'toggleNavMode': {
          const tab = activeTab()
          if (tab) updateTab(tab.id, (t) => ({ ...t, navMode: !t.navMode }))
          break
        }
        case 'navBack': {
          const tab = activeTab()
          if (tab && tab.navMode && tab.historyIndex > 0) {
            const target = tab.history[tab.historyIndex - 1]
            const node = findNode(treeRef.current, target)
            updateTab(tab.id, (t) => ({
              ...t,
              path: target,
              kind: node?.isDirectory ? 'folder' : 'note',
              historyIndex: t.historyIndex - 1,
              loadToken: t.loadToken + 1
            }))
          }
          break
        }
        case 'navForward': {
          const tab = activeTab()
          if (tab && tab.navMode && tab.historyIndex < tab.history.length - 1) {
            const target = tab.history[tab.historyIndex + 1]
            const node = findNode(treeRef.current, target)
            updateTab(tab.id, (t) => ({
              ...t,
              path: target,
              kind: node?.isDirectory ? 'folder' : 'note',
              historyIndex: t.historyIndex + 1,
              loadToken: t.loadToken + 1
            }))
          }
          break
        }
        case 'toggleSplit':
          setSplit((prev) => {
            if (prev) {
              // Sektion 2 in Sektion 1 übernehmen
              setPanes(([p0, p1]) => [
                {
                  tabs: [...p0.tabs, ...p1.tabs],
                  activeTabId: p0.activeTabId ?? p1.activeTabId
                },
                emptyPane()
              ])
              setActivePane(0)
            }
            return !prev
          })
          break
        case 'moveTabOtherPane': {
          const tab = activeTab()
          if (tab) moveTabToOtherPane(tab.id, activePaneRef.current)
          break
        }
        case 'toggleAssets':
          setAssetsVisible((prev) => !prev)
          break
      }
    })
    return off
  }, [activeEditor, activeTab, closeTab, createAtSelection, moveTabToOtherPane, updateTab])

  if (!vault) {
    return (
      <div className="welcome">
        <div className="welcome-drag-region" />
        <h1>MyNotion</h1>
        <p>Wähle einen Vault-Ordner mit Markdown-Notizen.</p>
        <button className="primary" onClick={() => void window.mynotion.pickVault()}>
          Vault öffnen …
        </button>
        {vaultMissing && recents.length > 0 && (
          <div className="welcome-recents">
            <h2>Zuletzt geöffnet</h2>
            {recents.map((r) => (
              <button key={r} onClick={() => void loadVault(r)}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const paneProps = (index: 0 | 1) => ({
    pane: panes[index],
    paneIndex: index,
    isActive: activePane === index || !split,
    tree,
    dirtyTabs,
    editorRefs,
    onActivatePane: () => setActivePane(index),
    onActivateTab: (tabId: string) =>
      setPanes((prev) => {
        const next = [...prev] as [Pane, Pane]
        next[index] = { ...next[index], activeTabId: tabId }
        return next
      }),
    onCloseTab: closeTab,
    onDropTab: (tabId: string, fromPane: number) => moveTabToOtherPane(tabId, fromPane),
    onLinkClick: handleLinkClick,
    onOverviewOpenNote: (tab: Tab, path: string) => {
      if (tab.navMode) navigateTab(tab.id, path, 'note')
      else openInNewTab(path, 'note', index)
    },
    onOverviewOpenFolder: (tab: Tab, path: string) => {
      expandFolder(path)
      navigateTab(tab.id, path, 'folder')
    },
    onToggleNavMode: (tabId: string) =>
      updateTab(tabId, (t) => ({ ...t, navMode: !t.navMode })),
    onNavBack: (tabId: string) => {
      const pane = panesRef.current[index]
      const tab = pane.tabs.find((t) => t.id === tabId)
      if (tab && tab.navMode && tab.historyIndex > 0) {
        const target = tab.history[tab.historyIndex - 1]
        const node = findNode(treeRef.current, target)
        updateTab(tabId, (t) => ({
          ...t,
          path: target,
          kind: node?.isDirectory ? 'folder' : 'note',
          historyIndex: t.historyIndex - 1,
          loadToken: t.loadToken + 1
        }))
      }
    },
    onNavForward: (tabId: string) => {
      const pane = panesRef.current[index]
      const tab = pane.tabs.find((t) => t.id === tabId)
      if (tab && tab.navMode && tab.historyIndex < tab.history.length - 1) {
        const target = tab.history[tab.historyIndex + 1]
        const node = findNode(treeRef.current, target)
        updateTab(tabId, (t) => ({
          ...t,
          path: target,
          kind: node?.isDirectory ? 'folder' : 'note',
          historyIndex: t.historyIndex + 1,
          loadToken: t.loadToken + 1
        }))
      }
    },
    onInsertLink: () => setLinkDialogOpen(true),
    onDirtyChange: (tabId: string, dirty: boolean) =>
      setDirtyTabs((prev) => {
        const has = prev.has(tabId)
        if (dirty === has) return prev
        const next = new Set(prev)
        if (dirty) next.add(tabId)
        else next.delete(tabId)
        return next
      })
  })

  return (
    <div className="app">
      <div className="titlebar-drag" />
      <div className="app-body">
        <Sidebar
          vault={vault}
          tree={tree}
          expanded={expanded}
          assetsVisible={assetsVisible}
          selectedPath={selectedPath}
          gitStatus={gitStatus}
          gitBusy={gitBusy}
          onToggleExpand={(path) =>
            setExpanded((prev) => {
              const next = new Set(prev)
              if (next.has(path)) next.delete(path)
              else next.add(path)
              return next
            })
          }
          onOpenFile={(path) => openInNewTab(path, 'note')}
          onOpenFolder={(path) => openFolderOverview(path)}
          onSelect={setSelectedPath}
          onCreateNote={(dir) => void handleCreateNote(dir)}
          onCreateFolder={(dir) => void handleCreateFolder(dir)}
          onRename={(path, newName) => void handleRename(path, newName)}
          onTrash={(path) => void handleTrash(path)}
          onShowInFolder={(path) => void window.mynotion.showInFolder(path)}
          onMove={(src, dest) => void handleMove(src, dest)}
          onNewNote={() => createAtSelection('note')}
          onNewFolder={() => createAtSelection('folder')}
          onReload={() => {
            void refreshTree()
            void refreshGit()
          }}
          onToggleAssets={() => setAssetsVisible((prev) => !prev)}
          onGitCommitPush={(msg) => void handleGitCommitPush(msg)}
          onGitPull={() => void handleGitPull()}
        />
        <div className={`panes${split ? ' split' : ''}`}>
          <PaneView {...paneProps(0)} />
          {split && <PaneView {...paneProps(1)} />}
        </div>
      </div>
      {gitMessage && (
        <div className="git-toast" onClick={() => setGitMessage(null)}>
          {gitMessage}
        </div>
      )}
      {linkDialogOpen && (
        <LinkDialog
          initialText={activeEditor()?.getSelectedText() ?? ''}
          onConfirm={insertLinkFromDialog}
          onCancel={() => setLinkDialogOpen(false)}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileNode, GitStatus, MenuAction, PdfExportProgress } from '../../shared/types'
import { autoNameFor, makeTab, type Pane, type Tab, type TabKind } from './types'
import { leadingH1, slugifyTitle } from './util/autoName'
import { basename, dirname, extname, isExternalLink, resolveVaultLink } from './util/paths'
import type { EditorHandle } from './components/Editor'
import { PaneView } from './components/Pane'
import { Sidebar } from './components/Sidebar'
import { LinkDialog } from './components/LinkDialog'

const emptyPane = (): Pane => ({ tabs: [], activeTabId: null })

const SIDEBAR_DEFAULT_WIDTH = 260
const SIDEBAR_MIN_WIDTH = 160
const SIDEBAR_MAX_WIDTH = 600

const clampSidebarWidth = (w: number): number =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, w))

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
  // Letzter Git-Fehler; bleibt sichtbar, bis eine Operation wieder gelingt
  const [gitError, setGitError] = useState<string | null>(null)
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set())
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  // laufender PDF-Export (Fortschritts-Toast); null = kein Export aktiv
  const [pdfProgress, setPdfProgress] = useState<{
    phase: PdfExportProgress['phase']
    done?: number
    total: number
  } | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem('sidebarWidth'))
    return Number.isFinite(stored) && stored > 0
      ? clampSidebarWidth(stored)
      : SIDEBAR_DEFAULT_WIDTH
  })
  const [sidebarResizing, setSidebarResizing] = useState(false)

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
    const t = await window.merkzeug.readTree(target)
    setTree(t)
    return t
  }, [])

  const refreshGit = useCallback(async (v?: string | null): Promise<void> => {
    const target = v ?? vaultRef.current
    if (!target) return
    try {
      setGitStatus(await window.merkzeug.gitStatus(target))
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

  /** PDF-Export: vorher alle offenen Notizen sichern, damit der Stand aktuell ist. */
  const exportPdf = useCallback(async (path: string): Promise<void> => {
    for (const handle of editorRefs.current.values()) await handle?.flush()
    await window.merkzeug.exportPdf(path)
  }, [])

  // Fortschritt des PDF-Exports empfangen
  useEffect(() => {
    const off = window.merkzeug.onPdfExportProgress((progress) => {
      if (progress.phase === 'done' || progress.phase === 'error' || !progress.total) {
        setPdfProgress(null)
      } else {
        setPdfProgress({ phase: progress.phase, done: progress.done, total: progress.total })
      }
    })
    return off
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

  /** Einen Schritt in der Tab-Historie zurück (-1) oder vorwärts (+1) gehen. */
  const stepHistory = useCallback(
    (tabId: string, delta: -1 | 1): void => {
      const tab = panesRef.current.flatMap((p) => p.tabs).find((t) => t.id === tabId)
      if (!tab || !tab.navMode) return
      const nextIndex = tab.historyIndex + delta
      if (nextIndex < 0 || nextIndex >= tab.history.length) return
      const target = tab.history[nextIndex]
      const node = findNode(treeRef.current, target)
      const kind: TabKind = node?.isDirectory ? 'folder' : 'note'
      updateTab(tabId, (t) => ({
        ...t,
        path: target,
        kind,
        historyIndex: nextIndex,
        loadToken: t.loadToken + 1,
        autoName: autoNameFor(target, kind)
      }))
    },
    [updateTab]
  )

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
        loadToken: tab.loadToken + 1,
        autoName: autoNameFor(path, kind)
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
        void window.merkzeug.openExternal(href)
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
            const exists = node !== null || (await window.merkzeug.fileExists(target))
            if (!exists) continue
            const isDir = node ? node.isDirectory : !extname(target)
            if (isDir) {
              openFolderOverview(target, tab.navMode ? tab : undefined)
            } else if (target.endsWith('.md')) {
              if (tab.navMode) navigateTab(tab.id, target, 'note')
              else openInNewTab(target, 'note')
            } else {
              void window.merkzeug.showInFolder(target)
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
      const path = await window.merkzeug.createNote(dir)
      await refreshTree()
      expandFolder(dir)
      openInNewTab(path, 'note')
      setSelectedPath(path)
    },
    [expandFolder, openInNewTab, refreshTree]
  )

  const handleCreateFolder = useCallback(
    async (dir: string): Promise<void> => {
      const path = await window.merkzeug.createFolder(dir)
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
        const newPath = await window.merkzeug.renamePath(path, newName)
        setPanes((prev) => {
          const mapPath = (p: string): string =>
            p === path ? newPath : p.startsWith(`${path}/`) ? newPath + p.slice(path.length) : p
          return prev.map((pane) => ({
            ...pane,
            tabs: pane.tabs.map((t) =>
              // manuell umbenannte Notiz nicht mehr automatisch benennen
              t.path === path
                ? { ...t, path: newPath, autoName: false }
                : { ...t, path: mapPath(t.path) }
            )
          })) as [Pane, Pane]
        })
        await refreshTree()
      } catch (err) {
        alert(String(err))
      }
    },
    [refreshTree]
  )

  /**
   * Nach jedem Speichern: Notizen mit Standardnamen ("Neue Notiz …") automatisch
   * nach ihrer Überschrift 1 benennen, bis sie manuell umbenannt werden.
   */
  const handleEditorSaved = useCallback(
    (tabId: string, markdown: string): void => {
      const tab = panesRef.current.flatMap((p) => p.tabs).find((t) => t.id === tabId)
      if (!tab || tab.kind !== 'note' || !tab.autoName) return
      const title = leadingH1(markdown)
      if (!title) return
      const slug = slugifyTitle(title)
      if (!slug || slug === basename(tab.path, '.md')) return
      const oldPath = tab.path
      void (async () => {
        let newPath: string
        try {
          newPath = await window.merkzeug.autoRenameNote(oldPath, slug)
        } catch {
          return
        }
        if (newPath === oldPath) return
        setPanes(
          (prev) =>
            prev.map((pane) => ({
              ...pane,
              tabs: pane.tabs.map((t) => (t.path === oldPath ? { ...t, path: newPath } : t))
            })) as [Pane, Pane]
        )
        setSelectedPath((p) => (p === oldPath ? newPath : p))
        await refreshTree()
      })()
    },
    [refreshTree]
  )

  const handleMove = useCallback(
    async (src: string, destDir: string): Promise<void> => {
      try {
        const newPath = await window.merkzeug.movePath(src, destDir)
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
      await window.merkzeug.trashPath(path)
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
      const result = await window.merkzeug.gitCommitPush(v, message)
      setGitBusy(false)
      setGitMessage(result.ok ? 'Commit & Push erfolgreich.' : `Fehler: ${result.output}`)
      setGitError(result.ok ? null : result.output)
      await refreshGit()
    },
    [refreshGit]
  )

  const handleGitPush = useCallback(async (): Promise<void> => {
    const v = vaultRef.current
    if (!v) return
    setGitBusy(true)
    setGitMessage(null)
    const result = await window.merkzeug.gitPush(v)
    setGitBusy(false)
    setGitMessage(result.ok ? 'Push erfolgreich.' : `Fehler: ${result.output}`)
    setGitError(result.ok ? null : result.output)
    await refreshGit()
  }, [refreshGit])

  const handleGitPull = useCallback(async (): Promise<void> => {
    const v = vaultRef.current
    if (!v) return
    setGitBusy(true)
    setGitMessage(null)
    const result = await window.merkzeug.gitPull(v)
    setGitBusy(false)
    setGitMessage(result.ok ? 'Pull erfolgreich.' : `Fehler: ${result.output}`)
    setGitError(result.ok ? null : result.output)
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
      await window.merkzeug.setTitle(`Merkzeug — ${basename(v)}`)
      await refreshTree(v)
      await refreshGit(v)
    },
    [refreshGit, refreshTree]
  )

  // Initialisierung
  useEffect(() => {
    void (async () => {
      const initial = await window.merkzeug.getInitialVault()
      if (initial) await loadVault(initial)
      else {
        setVaultMissing(true)
        setRecents(await window.merkzeug.getRecentVaults())
      }
    })()
    const offVaultSet = window.merkzeug.onVaultSet((v) => void loadVault(v))
    const offChanged = window.merkzeug.onVaultChanged(() => {
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
  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth))
  }, [sidebarWidth])

  // Menü-Aktionen
  useEffect(() => {
    const off = window.merkzeug.onMenuAction((action: MenuAction) => {
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
          else void window.merkzeug.closeWindow()
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
          if (tab) stepHistory(tab.id, -1)
          break
        }
        case 'navForward': {
          const tab = activeTab()
          if (tab) stepHistory(tab.id, 1)
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
        case 'exportPdf': {
          const tab = activeTab()
          if (tab?.kind === 'note') void exportPdf(tab.path)
          break
        }
      }
    })
    return off
  }, [activeEditor, activeTab, closeTab, createAtSelection, exportPdf, moveTabToOtherPane, stepHistory, updateTab])

  // Maus- und Trackpad-Gesten für Zurück/Vorwärts im Navigationsmodus
  useEffect(() => {
    const goActive = (delta: -1 | 1): void => {
      const pane = panesRef.current[activePaneRef.current]
      if (pane.activeTabId) stepHistory(pane.activeTabId, delta)
    }
    const isWindows = navigator.platform.startsWith('Win')
    const isMac = navigator.platform.startsWith('Mac')

    // Zurück-/Vorwärts-Zusatztasten der Maus.
    // Unter Windows kommen diese als app-command aus dem Main-Prozess (menu:action),
    // hier zusätzlich zu reagieren würde doppelt navigieren.
    const onMouseUp = (e: MouseEvent): void => {
      if (isWindows) return
      if (e.button === 3) {
        e.preventDefault()
        goActive(-1)
      } else if (e.button === 4) {
        e.preventDefault()
        goActive(1)
      }
    }

    // Zwei-Finger-Wischen auf dem macOS-Trackpad: horizontales Überscrollen erkennen.
    // (Electrons 'swipe'-Event feuert nur bei der Systemeinstellung „mit drei Fingern".)
    const SWIPE_THRESHOLD = 200
    let wheelAccum = 0
    let wheelFired = false
    let wheelReset: ReturnType<typeof setTimeout> | undefined
    const inHorizScrollable = (target: EventTarget | null): boolean => {
      let el = target instanceof Element ? target : null
      while (el) {
        if (el.scrollWidth > el.clientWidth + 1) return true
        el = el.parentElement
      }
      return false
    }
    const onWheel = (e: WheelEvent): void => {
      if (!isMac || e.ctrlKey) return
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      clearTimeout(wheelReset)
      wheelReset = setTimeout(() => {
        wheelAccum = 0
        wheelFired = false
      }, 250)
      if (wheelFired || inHorizScrollable(e.target)) return
      wheelAccum += e.deltaX
      if (wheelAccum <= -SWIPE_THRESHOLD) {
        wheelFired = true
        goActive(-1)
      } else if (wheelAccum >= SWIPE_THRESHOLD) {
        wheelFired = true
        goActive(1)
      }
    }

    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('wheel', onWheel)
      clearTimeout(wheelReset)
    }
  }, [stepHistory])

  if (!vault) {
    return (
      <div className="welcome">
        <div className="welcome-drag-region" />
        <h1>Merkzeug</h1>
        <p>Wähle einen Vault-Ordner mit Markdown-Notizen.</p>
        <button className="primary" onClick={() => void window.merkzeug.pickVault()}>
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
    onNavBack: (tabId: string) => stepHistory(tabId, -1),
    onNavForward: (tabId: string) => stepHistory(tabId, 1),
    onInsertLink: () => setLinkDialogOpen(true),
    onEditorSaved: handleEditorSaved,
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
          width={sidebarWidth}
          tree={tree}
          expanded={expanded}
          assetsVisible={assetsVisible}
          selectedPath={selectedPath}
          gitStatus={gitStatus}
          gitBusy={gitBusy}
          gitError={gitError}
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
          onShowInFolder={(path) => void window.merkzeug.showInFolder(path)}
          onExportPdf={(path) => void exportPdf(path)}
          onMove={(src, dest) => void handleMove(src, dest)}
          onNewNote={() => createAtSelection('note')}
          onNewFolder={() => createAtSelection('folder')}
          onReload={() => {
            void refreshTree()
            void refreshGit()
          }}
          onToggleAssets={() => setAssetsVisible((prev) => !prev)}
          onGitCommitPush={(msg) => void handleGitCommitPush(msg)}
          onGitPush={() => void handleGitPush()}
          onGitPull={() => void handleGitPull()}
        />
        <div
          className={`sidebar-resizer${sidebarResizing ? ' dragging' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            setSidebarResizing(true)
            // synthetische Events (UI-Testmodus) kennen kein Pointer-Capture
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* ignorieren */
            }
          }}
          onPointerMove={(e) => {
            if (sidebarResizing) setSidebarWidth(clampSidebarWidth(e.clientX))
          }}
          onPointerUp={() => setSidebarResizing(false)}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
          title="Ziehen zum Anpassen, Doppelklick für Standardbreite"
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
      {pdfProgress && (
        <div className="pdf-progress-toast">
          <span className="pdf-progress-label">
            {pdfProgress.phase === 'print'
              ? 'PDF-Export: PDF wird erzeugt …'
              : pdfProgress.phase === 'render' && pdfProgress.done
                ? `PDF-Export: Dokument ${Math.min(pdfProgress.done, pdfProgress.total - 1)} von ${pdfProgress.total - 1} gerendert …`
                : 'PDF-Export: Dokumente werden gerendert …'}
          </span>
          <div className="pdf-progress-track">
            <div
              className="pdf-progress-fill"
              style={{ width: `${Math.round(((pdfProgress.done ?? 0) / pdfProgress.total) * 100)}%` }}
            />
          </div>
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

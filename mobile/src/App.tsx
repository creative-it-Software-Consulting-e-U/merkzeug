import { meetingIdentity, firstHeading, headingFileBase } from '@merkzeug/core/meetingFiles'
import { assignedTemplate, loadTemplate } from './templates'
import { TemplateSettings } from './components/TemplateSettings'
import type { PdfTemplate } from '@merkzeug/core/pdf'
import { lazy, Suspense } from 'react'
const PrintPreview = lazy(() => import('./components/PrintPreview').then(m => ({ default: m.PrintPreview })))
import { GuidedTour } from '@merkzeug/editor/GuidedTour'
import { WorkingCopy } from './components/WorkingCopy'
import { VaultGuidance } from '@merkzeug/editor/VaultGuidance'
import { guidanceHost } from './vault'
import { MeetingNotes } from './components/MeetingNotes'
import { ThemeSelect } from '@merkzeug/editor/ThemeSelect'
import { t as translate } from '@merkzeug/core/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import { FolderList } from './components/FolderList'
import { HelpView } from './components/HelpView'
import { SearchView } from './components/SearchView'
import { Sheet } from './components/Sheet'
import {
  basename,
  dirname,
  extname,
  isExternalLink,
  joinPath,
  normalizePath,
  resolveVaultLink
} from './util/paths'
import { vault, type FileNode, type VaultInfo } from './vault'

type SheetState = { kind: 'create' } | { kind: 'item'; node: FileNode }

function findNode(tree: FileNode | null, path: string): FileNode | null {
  if (!tree) return null
  if (tree.path === path) return tree
  if (!tree.children) return null
  for (const child of tree.children) {
    if (path === child.path || path.startsWith(`${child.path}/`)) {
      return findNode(child, path)
    }
  }
  return null
}

export default function App(): React.JSX.Element {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [tree, setTree] = useState<FileNode | null>(null)
  const [stack, setStack] = useState<string[]>(['/'])
  const [stackIndex, setStackIndex] = useState(0)
  const [loadToken, setLoadToken] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [searching, setSearching] = useState(false)
  const [showMeetings, setShowMeetings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [printDoc, setPrintDoc] = useState<{ path: string; content: string } | null>(null)
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate | null>(null)
  const [preparingPrint, setPreparingPrint] = useState(false)
  const printPending = useRef(false)
  async function preparePrint() {
    if (printPending.current) return
    printPending.current = true; setPreparingPrint(true)
    try {
      const pending: Promise<void>[] = []
      window.dispatchEvent(new CustomEvent('merkzeug-flush', { detail: pending }))
      await Promise.all(pending)
      const result = await vault.readFile(current)
      const templateName = await assignedTemplate()
      setPdfTemplate(templateName ? await loadTemplate(templateName) : null)
      setPrintDoc({ path: current, content: result.content })
    } catch (error) { alert(String(error)) }
    finally { printPending.current = false; setPreparingPrint(false) }
  }
  const treeRef = useRef<FileNode | null>(null)
  treeRef.current = tree
  // Solange ein Overlay offen ist, sollen die Kanten-Wischgesten nicht greifen
  const overlayOpenRef = useRef(false)
  overlayOpenRef.current = sheet !== null || searching || showHelp || showMeetings

  const meetingRenamePending = useRef(false)
  const renameSavedMeeting = async (path: string, markdown: string): Promise<void> => {
    const title = firstHeading(markdown)
    if (!meetingIdentity(markdown) || !title || meetingRenamePending.current) return
    const base = headingFileBase(title)
    const prefix = dirname(path).replace(/\/$/, '') + '/'
    let target = prefix + base + '.md'
    if (target === path) return
    meetingRenamePending.current = true
    try {
      let n = 2
      while (target !== path && (await vault.exists(target) || await vault.exists(target.slice(0, -3) + '.assets'))) {
        target = prefix + base + `-${n++}.md`
      }
      if (target === path) return
      await vault.rename(path, target)
      setStack(previous => previous.map(p => p === path ? target : p))
      await reloadTree()
    } catch (error) { alert(String(error)) }
    finally { meetingRenamePending.current = false }
  }
  const current = stack[stackIndex]
  const isNote = current.endsWith('.md')

  const reloadTree = useCallback(async (): Promise<void> => {
    try {
      setTree(await vault.readTree())
    } catch (err) {
      console.warn(translate("Could not load the file tree"), err)
      setTree(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const restored = await vault.restoreVault()
        if (restored) {
          setVaultInfo(restored)
          if (restored.initialPath) {
            setStack(['/', restored.initialPath])
            setStackIndex(1)
          }
          await reloadTree()
        }
      } finally {
        setRestoring(false)
      }
    })()
  }, [reloadTree])

  // Beim Zurückkehren in den Vordergrund neu einlesen (z. B. nach Pull in Working Copy)
  useEffect(() => {
    const handler = (): void => {
      if (document.visibilityState === 'visible' && vaultInfo) void reloadTree()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [reloadTree, vaultInfo])

  const pickVault = useCallback(async (): Promise<void> => {
    try {
      const picked = await vault.pickVault()
      if (!picked) return
      setVaultInfo(picked)
      setStack(['/'])
      setStackIndex(0)
      setEditMode(false)
      await reloadTree()
    } catch (err) {
      alert(`${translate("Could not open vault:")} ${String(err)}`)
    }
  }, [reloadTree])

  // stackIndex synchron zugreifbar halten (navigateTo verändert Stack und Index zusammen)
  const stackIndexRef = useRef(stackIndex)
  stackIndexRef.current = stackIndex

  const navigateTo = useCallback((path: string): void => {
    const idx = stackIndexRef.current
    setStack((prev) => [...prev.slice(0, idx + 1), path])
    setStackIndex(idx + 1)
    setEditMode(false)
    setLoadToken((t) => t + 1)
  }, [])

  const goBack = useCallback((): void => {
    setStackIndex((idx) => Math.max(0, idx - 1))
    setEditMode(false)
    setLoadToken((t) => t + 1)
  }, [])

  const goForward = useCallback((): void => {
    setStackIndex((idx) => Math.min(stack.length - 1, idx + 1))
    setEditMode(false)
    setLoadToken((t) => t + 1)
  }, [stack.length])

  // iOS-Wischgesten: von der linken Kante = Zurück, von der rechten = Vorwärts.
  // Die View folgt dem Finger; ab einem Drittel Bildbreite wird navigiert.
  const goBackRef = useRef(goBack)
  const goForwardRef = useRef(goForward)
  goBackRef.current = goBack
  goForwardRef.current = goForward
  const stackLenRef = useRef(stack.length)
  stackLenRef.current = stack.length
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const EDGE = 28
    const MIN_SWIPE = 60
    let startX = -1
    let startY = -1
    let dragging: 'back' | 'forward' | null = null
    let decided = false
    let width = 1

    const reset = (el: HTMLElement): void => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.boxShadow = ''
    }

    const onStart = (e: TouchEvent): void => {
      if (overlayOpenRef.current) {
        dragging = null
        return
      }
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      decided = false
      dragging = null
      width = window.innerWidth
      if (startX <= EDGE && stackIndexRef.current > 0) dragging = 'back'
      else if (startX >= width - EDGE && stackIndexRef.current < stackLenRef.current - 1)
        dragging = 'forward'
    }

    const onMove = (e: TouchEvent): void => {
      const el = contentRef.current
      if (!dragging || !el) return
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        if (Math.abs(dy) > Math.abs(dx)) {
          dragging = null
          return
        }
        decided = true
      }
      const x = dragging === 'back' ? Math.max(0, Math.min(dx, width)) : Math.min(0, Math.max(dx, -width))
      el.style.transition = 'none'
      el.style.transform = `translateX(${x}px)`
      el.style.boxShadow = x !== 0 ? '0 0 24px rgba(0, 0, 0, 0.25)' : ''
    }

    const onEnd = (e: TouchEvent): void => {
      const el = contentRef.current
      if (!dragging || !el) return
      const kind = dragging
      dragging = null
      if (!decided) {
        reset(el)
        return
      }
      const dx = e.changedTouches[0].clientX - startX
      const commit =
        kind === 'back'
          ? dx > Math.max(MIN_SWIPE, width / 3)
          : dx < -Math.max(MIN_SWIPE, width / 3)
      el.style.transition = 'transform 0.18s ease-out'
      if (commit) {
        el.style.transform = `translateX(${kind === 'back' ? width : -width}px)`
        setTimeout(() => {
          if (kind === 'back') goBackRef.current()
          else goForwardRef.current()
          reset(el)
        }, 180)
      } else {
        el.style.transform = 'translateX(0)'
        setTimeout(() => reset(el), 200)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  /** Link-Auflösung wie in der Desktop-App, Vault-Wurzel ist "/". */
  const handleLinkClick = useCallback(
    (href: string): void => {
      if (isExternalLink(href)) {
        window.open(href, '_blank')
        return
      }
      const notePath = stack[stackIndexRef.current]
      const candidates = resolveVaultLink(href, notePath, '/')
      void (async () => {
        for (const candidate of candidates) {
          const withMd = extname(candidate) ? candidate : `${candidate}.md`
          for (const target of [candidate, withMd]) {
            const node = findNode(treeRef.current, target)
            const exists = node !== null || (await vault.exists(target))
            if (!exists) continue
            const isDir = node ? node.isDirectory : !extname(target)
            if (isDir || target.endsWith('.md')) navigateTo(target)
            return
          }
        }
      })()
    },
    [navigateTo, stack]
  )

  /** Verweise auf gelöschte/umbenannte Pfade aus dem Navigations-Stack werfen. */
  const pruneStack = useCallback(
    (oldPath: string): void => {
      const idx = stackIndexRef.current
      const keep = stack
        .map((path, i) => ({ path, i }))
        .filter(({ path }) => path !== oldPath && !path.startsWith(`${oldPath}/`))
      const next = keep.length > 0 ? keep.map((k) => k.path) : ['/']
      const newIdx = Math.max(0, Math.min(keep.filter((k) => k.i <= idx).length - 1, next.length - 1))
      setStack(next)
      setStackIndex(newIdx)
      setLoadToken((t) => t + 1)
    },
    [stack]
  )

  const validName = (name: string): boolean => {
    if (!name || name === '.' || name === '..' || /[/\\:]/.test(name)) {
      alert(translate("The name must not contain slashes or colons."))
      return false
    }
    return true
  }

  const createNote = useCallback(async (): Promise<void> => {
    const input = window.prompt(translate("New note name:"))?.trim()
    if (!input) return
    if (!validName(input)) return
    const title = input.replace(/\.md$/i, '')
    const path = normalizePath(joinPath(stack[stackIndexRef.current], `${title}.md`))
    try {
      if (await vault.exists(path)) {
        alert(translate("A note with this name already exists."))
        return
      }
      await vault.writeFile(path, `# ${title}\n`)
      await reloadTree()
      navigateTo(path)
      setEditMode(true)
    } catch (err) {
      alert(`${translate("Could not create note:")} ${String(err)}`)
    }
  }, [navigateTo, reloadTree, stack])

  const createFolder = useCallback(async (): Promise<void> => {
    const input = window.prompt(translate("New folder name:"))?.trim()
    if (!input) return
    if (!validName(input)) return
    const path = normalizePath(joinPath(stack[stackIndexRef.current], input))
    try {
      if (await vault.exists(path)) {
        alert(translate("An item with this name already exists."))
        return
      }
      await vault.createFolder(path)
      await reloadTree()
      navigateTo(path)
    } catch (err) {
      alert(`${translate("Could not create folder:")} ${String(err)}`)
    }
  }, [navigateTo, reloadTree, stack])

  const renameItem = useCallback(
    async (node: FileNode): Promise<void> => {
      const currentName = node.isDirectory ? node.name : node.name.replace(/\.md$/i, '')
      const input = window.prompt(translate("New name:"), currentName)?.trim()
      if (!input || input === currentName) return
      if (!validName(input)) return
      const newName = node.isDirectory ? input : `${input.replace(/\.md$/i, '')}.md`
      const to = normalizePath(joinPath(dirname(node.path), newName))
      try {
        await vault.rename(node.path, to)
        pruneStack(node.path)
        await reloadTree()
      } catch (err) {
        alert(`${translate("Rename failed:")} ${String(err)}`)
      }
    },
    [pruneStack, reloadTree]
  )

  const deleteItem = useCallback(
    async (node: FileNode): Promise<void> => {
      const label = node.isDirectory
        ? `${translate("Folder “")}${node.name}${translate("\" and all its contents?")}`
        : `${translate("Note “")}${node.name.replace(/\.md$/i, '')}"?`
      if (!confirm(label)) return
      try {
        await vault.deleteItem(node.path)
        pruneStack(node.path)
        await reloadTree()
      } catch (err) {
        alert(`${translate("Delete failed:")} ${String(err)}`)
      }
    },
    [pruneStack, reloadTree]
  )

  if (printDoc) return <Suspense fallback={<div>{translate('Preparing print preview…')}</div>}><PrintPreview {...printDoc} template={pdfTemplate} onClose={() => { setPrintDoc(null); setLoadToken(value => value + 1) }} /></Suspense>

  if (restoring) return <div className="start-screen" />

  if (!vaultInfo) {
    return (
      <div className="start-screen">
        <h1>Merkzeug</h1>
        <GuidedTour edition="ios" />
        <ThemeSelect />
        <p>
          {translate("Choose your vault folder, for example a repository provided by Working Copy.")}
        </p>
        <button className="primary-btn" onClick={() => void pickVault()}>
          {translate("Open vault folder")}
        </button>
        <button className="link-btn" onClick={() => setShowHelp(true)}>
          {translate("Show help")}
        </button>
        {showHelp && <HelpView onClose={() => setShowHelp(false)} />}
      </div>
    )
  }

  const title = current === '/' ? vaultInfo.name : basename(current, '.md')
  const folderNode = !isNote ? findNode(tree, current) : null

  return (
    <div className="app">
      <header className="topbar">
        <button className="bar-btn" onClick={goBack} disabled={stackIndex === 0} title={translate("Back")}>
          ‹
        </button>
        <button
          className="bar-btn"
          onClick={goForward}
          disabled={stackIndex >= stack.length - 1}
          title={translate("Forward")}
        >
          ›
        </button>
        <div className="topbar-title">
          {title}
          {dirty ? ' •' : ''}
        </div>
        {isNote ? (
          <button
            className={`bar-btn${editMode ? ' active' : ''}`}
            onClick={() => setEditMode((v) => !v)}
            title={editMode ? translate("Read only") : translate("Edit")}
          >
            ✎
          </button>
        ) : (
          <button
            className="bar-btn"
            onClick={() => setSheet({ kind: 'create' })}
            title={translate("New note or folder")}
          >
            ＋
          </button>
        )}
        <button className="bar-btn" onClick={() => setSearching(true)} title={translate("Search")}>
          🔍
        </button>
        <button className="bar-btn" onClick={() => void reloadTree()} title={translate("Refresh")}>
          ↻
        </button>
        <button className="bar-btn" onClick={() => setShowHelp(true)} title={translate("Help")}>
          ?
        </button>
        <button className="bar-btn" onClick={() => void pickVault()} title={translate("Open another vault")}>
          ⌂
        </button>
      </header>
      <GuidedTour edition="ios" />
      <WorkingCopy key={`git:${vaultInfo.id ?? vaultInfo.name}`} vaultId={vaultInfo.id ?? vaultInfo.name} />
      <VaultGuidance key={vaultInfo.id ?? vaultInfo.name} vaultId={vaultInfo.id ?? vaultInfo.name} host={guidanceHost} />
      <div className="appearance-bar">{isNote && <button disabled={preparingPrint} onClick={() => void preparePrint()}>{translate("Print…")}</button>}<button onClick={() => setShowMeetings(true)}>{translate('New meeting note')}</button><ThemeSelect /></div>
      {showMeetings && <MeetingNotes folder={isNote ? dirname(current) : current} onClose={() => setShowMeetings(false)} onOpen={path => { setShowMeetings(false); void reloadTree(); navigateTo(path) }} />}
      <TemplateSettings key={`templates:${vaultInfo.id ?? vaultInfo.name}`} vaultId={vaultInfo.id ?? vaultInfo.name} onChange={setPdfTemplate} />
      <main className="content" ref={contentRef}>
        {isNote ? (
          <Editor
            key={current}
            filePath={current}
            loadToken={loadToken}
            readonly={!editMode}
            onLinkClick={handleLinkClick}
            onDirtyChange={setDirty}
            onSaved={markdown => { void renameSavedMeeting(current, markdown) }}
          />
        ) : (
          <FolderList
            node={folderNode}
            onOpen={navigateTo}
            onItemMenu={(node) => setSheet({ kind: 'item', node })}
          />
        )}
      </main>
      {searching && (
        <SearchView
          onOpen={(path) => {
            setSearching(false)
            navigateTo(path)
          }}
          onClose={() => setSearching(false)}
        />
      )}
      {showHelp && <HelpView onClose={() => setShowHelp(false)} />}
      {sheet?.kind === 'create' && (
        <Sheet
          title={translate("Create new")}
          onClose={() => setSheet(null)}
          actions={[
            { label: translate("New note"), onSelect: () => void createNote() },
            { label: translate("New folder"), onSelect: () => void createFolder() }
          ]}
        />
      )}
      {sheet?.kind === 'item' && (
        <Sheet
          title={sheet.node.isDirectory ? sheet.node.name : sheet.node.name.replace(/\.md$/i, '')}
          onClose={() => setSheet(null)}
          actions={[
            { label: translate("Rename"), onSelect: () => void renameItem(sheet.node) },
            { label: translate("Delete"), danger: true, onSelect: () => void deleteItem(sheet.node) }
          ]}
        />
      )}
    </div>
  )
}

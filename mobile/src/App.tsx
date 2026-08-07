import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import { FolderList } from './components/FolderList'
import { basename, extname, isExternalLink, resolveVaultLink } from './util/paths'
import { vault, type FileNode, type VaultInfo } from './vault'

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
  const treeRef = useRef<FileNode | null>(null)
  treeRef.current = tree

  const current = stack[stackIndex]
  const isNote = current.endsWith('.md')

  const reloadTree = useCallback(async (): Promise<void> => {
    try {
      setTree(await vault.readTree())
    } catch (err) {
      console.warn('Baum konnte nicht gelesen werden', err)
      setTree(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const restored = await vault.restoreVault()
        if (restored) {
          setVaultInfo(restored)
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
      alert(`Vault konnte nicht geöffnet werden: ${String(err)}`)
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

  if (restoring) return <div className="start-screen" />

  if (!vaultInfo) {
    return (
      <div className="start-screen">
        <h1>Merkzeug</h1>
        <p>
          Wähle deinen Vault-Ordner – z.&nbsp;B. ein Repository, das Working&nbsp;Copy
          bereitstellt.
        </p>
        <button className="primary-btn" onClick={() => void pickVault()}>
          Vault-Ordner öffnen
        </button>
      </div>
    )
  }

  const title = current === '/' ? vaultInfo.name : basename(current, '.md')
  const folderNode = !isNote ? findNode(tree, current) : null

  return (
    <div className="app">
      <header className="topbar">
        <button className="bar-btn" onClick={goBack} disabled={stackIndex === 0} title="Zurück">
          ‹
        </button>
        <button
          className="bar-btn"
          onClick={goForward}
          disabled={stackIndex >= stack.length - 1}
          title="Vorwärts"
        >
          ›
        </button>
        <div className="topbar-title">
          {title}
          {dirty ? ' •' : ''}
        </div>
        {isNote && (
          <button
            className={`bar-btn${editMode ? ' active' : ''}`}
            onClick={() => setEditMode((v) => !v)}
            title={editMode ? 'Nur lesen' : 'Bearbeiten'}
          >
            ✎
          </button>
        )}
        <button className="bar-btn" onClick={() => void reloadTree()} title="Neu einlesen">
          ↻
        </button>
        <button className="bar-btn" onClick={() => void pickVault()} title="Anderen Vault öffnen">
          ⌂
        </button>
      </header>
      <main className="content" ref={contentRef}>
        {isNote ? (
          <Editor
            key={current}
            filePath={current}
            loadToken={loadToken}
            readonly={!editMode}
            onLinkClick={handleLinkClick}
            onDirtyChange={setDirty}
          />
        ) : (
          <FolderList node={folderNode} onOpen={navigateTo} />
        )}
      </main>
    </div>
  )
}

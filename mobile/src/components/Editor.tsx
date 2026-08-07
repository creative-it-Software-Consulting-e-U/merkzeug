import { useCallback, useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { renderMermaid } from '../util/mermaid'
import { isExternalLink, dirname, joinPath, normalizePath, extname } from '../util/paths'
import { vault, isConflictError } from '../vault'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

interface EditorProps {
  filePath: string
  /** Änderung erzwingt Neuladen (Navigation zu anderer Notiz) */
  loadToken: number
  readonly: boolean
  onLinkClick: (href: string) => void
  onDirtyChange?: (dirty: boolean) => void
}

const AUTOSAVE_MS = 1000

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.heic': 'image/heic'
}

export function Editor({
  filePath,
  loadToken,
  readonly,
  onLinkClick,
  onDirtyChange
}: EditorProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const filePathRef = useRef(filePath)
  const dirtyRef = useRef(false)
  const latestMarkdownRef = useRef<string | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mtimeRef = useRef<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Erzwingt Neuladen von der Platte (nach externem Update oder verworfenem Konflikt)
  const [reloadCounter, setReloadCounter] = useState(0)

  filePathRef.current = filePath

  const doSave = useCallback(
    async (force = false): Promise<void> => {
      if (!dirtyRef.current || latestMarkdownRef.current === null) return
      const markdown = latestMarkdownRef.current
      try {
        const mtime = await vault.writeFile(
          filePathRef.current,
          markdown,
          force ? undefined : (mtimeRef.current ?? undefined)
        )
        mtimeRef.current = mtime
        lastSavedRef.current = markdown
        dirtyRef.current = false
        onDirtyChange?.(false)
      } catch (err) {
        if (!isConflictError(err)) {
          alert(`Speichern fehlgeschlagen: ${String(err)}`)
          return
        }
        // Stale: Die Notiz wurde extern geändert (z. B. Pull in Working Copy).
        const overwrite = confirm(
          'Diese Notiz wurde außerhalb von Merkzeug geändert (z. B. durch ' +
            'Working Copy).\n\nOK überschreibt den externen Stand mit deiner ' +
            'Version, Abbrechen verwirft deine Änderungen und lädt neu.'
        )
        if (overwrite) {
          await doSave(true)
        } else {
          dirtyRef.current = false
          onDirtyChange?.(false)
          setReloadCounter((c) => c + 1)
        }
      }
    },
    [onDirtyChange]
  )

  const scheduleSave = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => void doSave(), AUTOSAVE_MS)
  }, [doSave])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    return vault.saveImage(filePathRef.current, btoa(binary), ext)
  }, [])

  // Vault-Bilder als data-URI laden (die WebView kennt keine Vault-Pfade)
  const displayUrl = useCallback(async (url: string): Promise<string> => {
    if (!url || isExternalLink(url) || url.startsWith('data:')) return url
    const decoded = decodeURI(url)
    const abs = decoded.startsWith('/')
      ? normalizePath(decoded)
      : normalizePath(joinPath(dirname(filePathRef.current), decoded))
    try {
      const data = await vault.readFileBase64(abs)
      const mime = MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream'
      return `data:${mime};base64,${data}`
    } catch {
      return url
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let crepe: Crepe | null = null
    setLoadError(null)

    const setup = async (): Promise<void> => {
      let content: string
      try {
        const loaded = await vault.readFile(filePathRef.current)
        content = loaded.content
        mtimeRef.current = loaded.mtime
      } catch (err) {
        if (!cancelled) setLoadError(String(err))
        return
      }
      if (cancelled || !rootRef.current) return
      rootRef.current.innerHTML = ''

      crepe = new Crepe({
        root: rootRef.current,
        defaultValue: content,
        features: {
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: 'Schreibe etwas – „/“ für Befehle …',
            mode: 'block'
          },
          [Crepe.Feature.LinkTooltip]: {
            inputPlaceholder: 'Link eingeben …',
            onCopyLink: () => undefined
          },
          [Crepe.Feature.CodeMirror]: {
            previewLabel: 'Vorschau',
            previewToggleButton: (previewOnly: boolean) =>
              previewOnly ? 'Bearbeiten' : 'Diagramm',
            previewOnlyByDefault: true,
            searchPlaceholder: 'Sprache suchen …',
            noResultText: 'Keine Treffer',
            copyText: 'Kopieren',
            renderPreview: (
              language: string,
              code: string,
              apply: (v: null | string | HTMLElement) => void
            ) => {
              if (language !== 'mermaid' || !code.trim()) return null
              renderMermaid(code)
                .then((svg) => {
                  const wrap = document.createElement('div')
                  wrap.className = 'mermaid-preview'
                  wrap.innerHTML = svg
                  apply(wrap)
                })
                .catch(() => {
                  const err = document.createElement('div')
                  err.className = 'mermaid-error'
                  err.textContent = 'Mermaid-Diagramm konnte nicht gerendert werden.'
                  apply(err)
                })
            }
          },
          [Crepe.Feature.ImageBlock]: {
            proxyDomURL: displayUrl,
            onUpload: uploadImage,
            blockOnUpload: uploadImage,
            inlineOnUpload: uploadImage,
            blockUploadButton: 'Bild auswählen',
            blockUploadPlaceholderText: 'oder Bild-Adresse einfügen',
            inlineUploadButton: 'Bild auswählen',
            inlineUploadPlaceholderText: 'oder Bild-Adresse einfügen',
            blockConfirmButton: 'Einfügen',
            inlineConfirmButton: 'Einfügen',
            blockCaptionPlaceholderText: 'Beschriftung'
          },
          [Crepe.Feature.BlockEdit]: {
            textGroup: {
              label: 'Text',
              text: { label: 'Text' },
              h1: { label: 'Überschrift 1' },
              h2: { label: 'Überschrift 2' },
              h3: { label: 'Überschrift 3' },
              h4: { label: 'Überschrift 4' },
              h5: { label: 'Überschrift 5' },
              h6: { label: 'Überschrift 6' },
              quote: { label: 'Zitat' },
              divider: { label: 'Trennlinie' }
            },
            listGroup: {
              label: 'Listen',
              bulletList: { label: 'Aufzählung' },
              orderedList: { label: 'Nummerierte Liste' },
              taskList: { label: 'Aufgabenliste' }
            },
            advancedGroup: {
              label: 'Einfügen',
              image: { label: 'Bild' },
              codeBlock: { label: 'Codeblock' },
              table: { label: 'Tabelle' }
            }
          }
        }
      })

      // Öffnen darf die Datei nie verändern: solange noch nichts gespeichert
      // wurde, gilt die Serialisierung nach dem Laden (Baseline) als sauber.
      let baseline: string | null = null

      // Serialisierungsstil wie Desktop-App ("-"-Aufzählungen, "---"-Trennlinien)
      crepe.editor.config((ctx) => {
        ctx.update(remarkStringifyOptionsCtx, (opts) => ({
          ...opts,
          bullet: '-' as const,
          rule: '-' as const
        }))
      })

      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          latestMarkdownRef.current = markdown
          const clean =
            lastSavedRef.current === null
              ? baseline === null || markdown === baseline
              : markdown === lastSavedRef.current
          if (clean) return
          if (!dirtyRef.current) {
            dirtyRef.current = true
            onDirtyChange?.(true)
          }
          scheduleSave()
        })
      })

      await crepe.create()
      if (cancelled) {
        void crepe.destroy()
        return
      }
      baseline = crepe.getMarkdown()
      latestMarkdownRef.current = content
      lastSavedRef.current = null
      dirtyRef.current = false
      crepe.setReadonly(readonly)
      crepeRef.current = crepe
    }

    void setup()

    return () => {
      cancelled = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const instance = crepe
      if (instance) {
        if (dirtyRef.current && latestMarkdownRef.current !== null) {
          dirtyRef.current = false
          void vault
            .writeFile(filePathRef.current, latestMarkdownRef.current, mtimeRef.current ?? undefined)
            .catch((err) => {
              if (isConflictError(err)) {
                alert(
                  'Die Notiz wurde außerhalb von Merkzeug geändert – die letzten ' +
                    'Änderungen wurden deshalb nicht gespeichert.'
                )
              } else {
                console.warn('Speichern beim Verlassen fehlgeschlagen', err)
              }
            })
        }
        crepeRef.current = null
        void instance.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadToken, reloadCounter])

  useEffect(() => {
    crepeRef.current?.setReadonly(readonly)
  }, [readonly])

  // Speichern, wenn die App in den Hintergrund geht (iOS kennt kein
  // beforeunload); beim Zurückkehren extern geänderte Notizen neu laden.
  useEffect(() => {
    const handler = (): void => {
      if (document.visibilityState === 'hidden') {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        void doSave()
      } else if (document.visibilityState === 'visible' && !dirtyRef.current) {
        void (async () => {
          try {
            const stat = await vault.stat(filePathRef.current)
            if (
              stat.exists &&
              stat.mtime !== undefined &&
              mtimeRef.current !== null &&
              stat.mtime > mtimeRef.current + 1
            ) {
              setReloadCounter((c) => c + 1)
            }
          } catch {
            // Ignorieren – beim nächsten Öffnen wird ohnehin frisch geladen.
          }
        })()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [doSave])

  const handleClickCapture = useCallback(
    (e: React.MouseEvent): void => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      e.preventDefault()
      e.stopPropagation()
      onLinkClick(href)
    },
    [onLinkClick]
  )

  if (loadError) {
    return <div className="editor-error">Datei konnte nicht geladen werden: {loadError}</div>
  }

  return (
    <div className="editor-host" onClickCapture={handleClickCapture}>
      <div ref={rootRef} className="editor-root" />
    </div>
  )
}

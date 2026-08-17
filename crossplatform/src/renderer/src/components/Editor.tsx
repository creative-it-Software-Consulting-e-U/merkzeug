import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { $inputRule, callCommand } from '@milkdown/kit/utils'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import {
  createCodeBlockCommand,
  insertHrCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  deleteSelectedCellsCommand,
  insertTableCommand,
  toggleStrikethroughCommand
} from '@milkdown/kit/preset/gfm'
import { splitFrontmatter } from '../../../shared/docTitle'
import { renderMermaid } from '../util/mermaid'
import { jumpToFragment } from '../util/anchors'
import { isExternalLink } from '../util/paths'
import type { JumpTarget } from '../types'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

export type FormatAction =
  | 'text'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'inlineCode'
  | 'bulletList'
  | 'orderedList'
  | 'quote'
  | 'codeBlock'
  | 'hr'

export interface EditorHandle {
  undo: () => void
  redo: () => void
  format: (action: FormatAction) => void
  insertTable: (rows?: number, cols?: number) => void
  tableCommand: (
    kind: 'rowAbove' | 'rowBelow' | 'colBefore' | 'colAfter' | 'deleteRow' | 'deleteCol'
  ) => void
  insertLink: (text: string, href: string) => void
  insertImageFile: (file: File) => Promise<void>
  openImagePicker: () => void
  flush: () => Promise<void>
  flushSync: () => void
  getSelectedText: () => string
  /** aktuelle Scroll-Position des Editors (für die Tab-Historie) */
  getScrollTop: () => number
}

interface EditorProps {
  filePath: string
  /** Änderung erzwingt Neuladen (Navigation im selben Tab) */
  loadToken: number
  readonly: boolean
  /** aufgerufen bei Klick auf einen Link im Editor */
  onLinkClick: (href: string) => void
  /** Ziel (Anker oder Scroll-Position), das ggf. erst nach dem Laden angesprungen wird */
  jump?: JumpTarget | null
  onDirtyChange?: (dirty: boolean) => void
  /** aufgerufen nach jedem Speichern mit dem gespeicherten Markdown */
  onSaved?: (markdown: string) => void
}

const AUTOSAVE_MS = 1000
// Anker-Sprung nach dem Laden: begrenzt oft nachprobieren, falls das DOM
// (Heading-IDs, Layout) noch nicht fertig ist; danach still oben bleiben
const ANCHOR_RETRY_MS = 150
const ANCHOR_MAX_TRIES = 7

/** "-" gefolgt von ">" wird beim Tippen zu einem Pfeil "→". */
const arrowInputRule = $inputRule(() => new InputRule(/->$/, '→'))

/** Inhalt eines Frontmatter-Blocks ohne die umschließenden Trennzeilen (`---`/`...`). */
function frontmatterInner(block: string): string {
  const lines = block.split(/(?<=\n)/)
  if (lines.length < 2) return ''
  return lines.slice(1, -1).join('')
}

/** Editierten Frontmatter-Text wieder als vollständigen Block verpacken; leer → kein Block. */
function wrapFrontmatter(inner: string): string {
  if (inner.trim() === '') return ''
  return `---\n${inner.endsWith('\n') ? inner : inner + '\n'}---\n`
}

/** Frontmatter-Felder, die die App auswertet — Grundlage des „+ Feld“-Menüs. */
const FRONTMATTER_FIELDS: { key: string; insert: string; hint: string }[] = [
  {
    key: 'title',
    insert: 'title: ',
    hint: 'Titel der Notiz – bestimmt {{titel}} beim PDF-Export'
  },
  {
    key: 'pdf-exclude',
    insert: 'pdf-exclude:\n  - ',
    hint: 'Verlinkte Dokumente, die der PDF-Export auslässt'
  }
]

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { filePath, loadToken, readonly, onLinkClick, jump, onDirtyChange, onSaved },
  ref
): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const filePathRef = useRef(filePath)
  const dirtyRef = useRef(false)
  const latestMarkdownRef = useRef<string | null>(null)
  // YAML-Frontmatter der Datei: wird im Editor nicht angezeigt, beim
  // Speichern aber unverändert wieder vorangestellt
  const frontmatterRef = useRef('')
  // Frontmatter-Balken über dem Text: auf-/zugeklappt + editierbarer Inhalt
  const [fmOpen, setFmOpen] = useState(false)
  const [fmText, setFmText] = useState('')
  const [fmMenuOpen, setFmMenuOpen] = useState(false)
  const fmMenuRef = useRef<HTMLDivElement | null>(null)
  const fmTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  // wurde das Frontmatter seit dem letzten Laden editiert? (für das Ladefenster)
  const fmDirtyRef = useRef(false)
  const lastSavedRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Externe Änderungen: letzter bekannter Stand auf der Platte + Konfliktzustand
  const lastDiskRef = useRef<string | null>(null)
  const conflictRef = useRef(false)
  const [conflict, setConflict] = useState(false)
  const [diskToken, setDiskToken] = useState(0)
  // Hinweis "neu geladen um …" – bleibt bis zum Wegklicken oder Weitertippen
  const [reloadInfo, setReloadInfo] = useState<string | null>(null)
  const prevLoadTokenRef = useRef(loadToken)
  // Sprungziel, das erst nach Abschluss des Ladens angesprungen werden kann
  const pendingJumpRef = useRef<JumpTarget | null>(null)
  const anchorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Pfadwechsel ohne Neuladen (Umbenennen/Verschieben): nur Speicherziel anpassen
  filePathRef.current = filePath

  const doSave = useCallback(async (): Promise<void> => {
    if (conflictRef.current) return
    if (!dirtyRef.current || latestMarkdownRef.current === null) return
    dirtyRef.current = false
    onDirtyChange?.(false)
    const markdown = latestMarkdownRef.current
    const full = frontmatterRef.current + markdown
    lastSavedRef.current = markdown
    lastDiskRef.current = full
    await window.merkzeug.writeFile(filePathRef.current, full)
    onSaved?.(markdown)
  }, [onDirtyChange, onSaved])

  const flushSync = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (conflictRef.current) return
    if (!dirtyRef.current || latestMarkdownRef.current === null) return
    dirtyRef.current = false
    onDirtyChange?.(false)
    const markdown = latestMarkdownRef.current
    const full = frontmatterRef.current + markdown
    lastSavedRef.current = markdown
    lastDiskRef.current = full
    window.merkzeug.writeFileSync(filePathRef.current, full)
    onSaved?.(markdown)
  }, [onDirtyChange, onSaved])

  const scheduleSave = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => void doSave(), AUTOSAVE_MS)
  }, [doSave])

  const applyFmText = useCallback(
    (text: string): void => {
      setFmText(text)
      frontmatterRef.current = wrapFrontmatter(text)
      fmDirtyRef.current = true
      if (!dirtyRef.current) {
        dirtyRef.current = true
        onDirtyChange?.(true)
        setReloadInfo(null)
      }
      scheduleSave()
    },
    [onDirtyChange, scheduleSave]
  )

  const handleFrontmatterChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => applyFmText(e.target.value),
    [applyFmText]
  )

  /** Vorlagen-Zeile aus dem „+ Feld“-Menü ans Ende des Frontmatters anfügen. */
  const insertFmField = useCallback(
    (insert: string): void => {
      setFmMenuOpen(false)
      setFmOpen(true)
      const base = fmText.trim() === '' ? '' : fmText.endsWith('\n') ? fmText : fmText + '\n'
      const next = base + insert
      applyFmText(next)
      // fokussieren und Cursor ans Ende, sobald das Textfeld gerendert ist
      requestAnimationFrame(() => {
        const ta = fmTextareaRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(next.length, next.length)
        }
      })
    },
    [applyFmText, fmText]
  )

  // „+ Feld“-Menü bei Klick außerhalb oder Escape schließen
  useEffect(() => {
    if (!fmMenuOpen) return
    const close = (e: MouseEvent): void => {
      if (!fmMenuRef.current?.contains(e.target as Node)) setFmMenuOpen(false)
    }
    const esc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFmMenuOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [fmMenuOpen])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    return window.merkzeug.saveImage(filePathRef.current, btoa(binary), ext)
  }, [])

  /** Zum Anker springen; probiert begrenzt oft nach, bis das Ziel im DOM steht. */
  const jumpWhenAvailable = useCallback((fragment: string): void => {
    if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current)
    let tries = 0
    const attempt = (): void => {
      const root = rootRef.current
      if (root && jumpToFragment(root, fragment)) return
      tries += 1
      if (tries >= ANCHOR_MAX_TRIES) return // kein passendes Ziel: oben bleiben
      anchorTimerRef.current = setTimeout(attempt, ANCHOR_RETRY_MS)
    }
    attempt()
  }, [])

  /**
   * Gemerkte Scroll-Position wiederherstellen; wie beim Anker-Sprung kurz
   * nachjustieren, weil spät gerenderte Blöcke die Inhaltshöhe noch ändern.
   */
  const restoreScroll = useCallback((top: number): void => {
    for (const timer of scrollTimersRef.current) clearTimeout(timer)
    scrollTimersRef.current = []
    const apply = (): void => {
      if (hostRef.current) hostRef.current.scrollTop = top
    }
    apply()
    for (const delay of [250, 700, 1400]) {
      scrollTimersRef.current.push(setTimeout(apply, delay))
    }
  }, [])

  /** Sprungziel ausführen: gemerkte Scroll-Position vor Anker. */
  const applyJump = useCallback(
    (target: JumpTarget): void => {
      if (target.scrollTop != null) restoreScroll(target.scrollTop)
      else if (target.fragment) jumpWhenAvailable(target.fragment)
    },
    [jumpWhenAvailable, restoreScroll]
  )

  const displayUrl = useCallback((url: string): string => {
    if (!url || isExternalLink(url) || url.startsWith('data:') || url.startsWith('vault-file:')) {
      return url
    }
    const decoded = decodeURI(url)
    const abs = decoded.startsWith('/')
      ? decoded
      : `${filePathRef.current.replace(/[/\\][^/\\]*$/, '')}/${decoded}`
    return `vault-file://local${encodeURI(abs.replace(/\\/g, '/'))}`
  }, [])

  useEffect(() => {
    let cancelled = false
    let crepe: Crepe | null = null
    setLoadError(null)
    conflictRef.current = false
    setConflict(false)
    if (prevLoadTokenRef.current !== loadToken) {
      // Navigation/Neuladen im selben Tab: alter Hinweis gilt nicht mehr
      prevLoadTokenRef.current = loadToken
      setReloadInfo(null)
      setFmOpen(false)
      setFmMenuOpen(false)
    }

    const setup = async (): Promise<void> => {
      let content: string
      try {
        content = await window.merkzeug.readFile(filePathRef.current)
      } catch (err) {
        if (!cancelled) setLoadError(String(err))
        return
      }
      lastDiskRef.current = content
      // Frontmatter nicht in den Editor geben; beim Speichern wieder voranstellen
      const { frontmatter, body } = splitFrontmatter(content)
      frontmatterRef.current = frontmatter
      fmDirtyRef.current = false
      // bis der Editor steht, keinen (alten) Inhalt speichern
      latestMarkdownRef.current = null
      if (cancelled || !rootRef.current) return
      setFmText(frontmatterInner(frontmatter))
      rootRef.current.innerHTML = ''

      crepe = new Crepe({
        root: rootRef.current,
        defaultValue: body,
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
            renderPreview: (language: string, content2: string, apply: (v: null | string | HTMLElement) => void) => {
              if (language !== 'mermaid' || !content2.trim()) return null
              renderMermaid(content2)
                .then((svg) => {
                  // Kein addEventListener hier: Crepe sanitisiert die Vorschau
                  // (innerHTML), Listener gehen verloren. Klicks behandelt der
                  // Capture-Handler des Editors (handleClickCapture).
                  const wrap = document.createElement('div')
                  wrap.className = 'mermaid-preview'
                  wrap.innerHTML = svg
                  const zoomBtn = document.createElement('button')
                  zoomBtn.className = 'mermaid-zoom-btn'
                  zoomBtn.title = 'Diagramm vergrößern'
                  zoomBtn.textContent = '🔍'
                  wrap.appendChild(zoomBtn)
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
      // Nach dem ersten Speichern zählt der zuletzt geschriebene Stand.
      let baseline: string | null = null

      // Serialisierungsstil an die Mac-App angleichen ("-"-Aufzählungen, "---"-Trennlinien)
      crepe.editor.config((ctx) => {
        ctx.update(remarkStringifyOptionsCtx, (opts) => ({
          ...opts,
          bullet: '-' as const,
          rule: '-' as const
        }))
      })
      crepe.editor.use(arrowInputRule)

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
            setReloadInfo(null)
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
      latestMarkdownRef.current = body
      lastSavedRef.current = null
      // dirty nur behalten, wenn während des Ladens Frontmatter editiert wurde;
      // spurige markdownUpdated-Events beim Aufbau zählen nicht
      dirtyRef.current = fmDirtyRef.current
      if (fmDirtyRef.current) scheduleSave()
      crepe.setReadonly(readonly)
      crepeRef.current = crepe
      // während des Ladens angefallenes Sprungziel jetzt ausführen
      const pending = pendingJumpRef.current
      if (pending) {
        pendingJumpRef.current = null
        applyJump(pending)
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current)
      for (const timer of scrollTimersRef.current) clearTimeout(timer)
      scrollTimersRef.current = []
      const instance = crepe
      if (instance) {
        if (!conflictRef.current && dirtyRef.current && latestMarkdownRef.current !== null) {
          dirtyRef.current = false
          void window.merkzeug.writeFile(
            filePathRef.current,
            frontmatterRef.current + latestMarkdownRef.current
          )
        }
        crepeRef.current = null
        void instance.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadToken, diskToken])

  useEffect(() => {
    crepeRef.current?.setReadonly(readonly)
  }, [readonly])

  // Sprungziel: sofort ausführen, wenn der Editor schon steht, sonst nach dem Laden
  useEffect(() => {
    if (!jump) return
    if (crepeRef.current) applyJump(jump)
    else pendingJumpRef.current = jump
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.token])

  // Externe Änderungen der offenen Datei erkennen: ohne eigene ungespeicherte
  // Änderungen automatisch neu laden, sonst Konflikt-Banner zeigen (und den
  // Autosave pausieren, damit nichts überschrieben wird).
  useEffect(() => {
    const off = window.merkzeug.onVaultChanged((_vault, paths) => {
      if (conflictRef.current) return
      if (paths.length === 0 || !paths.includes(filePathRef.current)) return
      void (async () => {
        let disk: string
        try {
          disk = await window.merkzeug.readFile(filePathRef.current)
        } catch {
          return
        }
        if (disk === lastDiskRef.current) return
        if (dirtyRef.current) {
          conflictRef.current = true
          setConflict(true)
        } else {
          setReloadInfo(new Date().toLocaleTimeString())
          setDiskToken((t) => t + 1)
        }
      })()
    })
    return off
  }, [])

  const resolveConflictReload = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    conflictRef.current = false
    setConflict(false)
    dirtyRef.current = false
    onDirtyChange?.(false)
    setReloadInfo(new Date().toLocaleTimeString())
    setDiskToken((t) => t + 1)
  }, [onDirtyChange])

  const resolveConflictKeep = useCallback((): void => {
    conflictRef.current = false
    setConflict(false)
    void doSave()
  }, [doSave])

  // Speichern, wenn das Fenster geschlossen wird
  useEffect(() => {
    const handler = (): void => flushSync()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [flushSync])

  const runCommand = useCallback((cmd: { key: never } | unknown, payload?: unknown): void => {
    const crepe = crepeRef.current
    if (!crepe) return
    try {
      crepe.editor.action(
        callCommand((cmd as { key: Parameters<typeof callCommand>[0] }).key, payload as never)
      )
    } catch (err) {
      console.warn('Kommando fehlgeschlagen', err)
    }
  }, [])

  useImperativeHandle(
    ref,
    (): EditorHandle => ({
      undo: () => runCommand(undoCommand),
      redo: () => runCommand(redoCommand),
      format: (action) => {
        const crepe = crepeRef.current
        if (!crepe) return
        switch (action) {
          case 'text':
            runCommand(turnIntoTextCommand)
            break
          case 'h1':
          case 'h2':
          case 'h3':
            runCommand(wrapInHeadingCommand, Number(action[1]))
            break
          case 'bold':
            runCommand(toggleStrongCommand)
            break
          case 'italic':
            runCommand(toggleEmphasisCommand)
            break
          case 'strike':
            runCommand(toggleStrikethroughCommand)
            break
          case 'inlineCode':
            runCommand(toggleInlineCodeCommand)
            break
          case 'bulletList':
            runCommand(wrapInBulletListCommand)
            break
          case 'orderedList':
            runCommand(wrapInOrderedListCommand)
            break
          case 'quote':
            runCommand(wrapInBlockquoteCommand)
            break
          case 'codeBlock':
            runCommand(createCodeBlockCommand)
            break
          case 'hr':
            runCommand(insertHrCommand)
            break
        }
        crepe.editor.action((ctx) => ctx.get(editorViewCtx).focus())
      },
      insertTable: (rows = 3, cols = 3) => runCommand(insertTableCommand, { row: rows, col: cols }),
      tableCommand: (kind) => {
        const map = {
          rowAbove: addRowBeforeCommand,
          rowBelow: addRowAfterCommand,
          colBefore: addColBeforeCommand,
          colAfter: addColAfterCommand,
          deleteRow: deleteSelectedCellsCommand,
          deleteCol: deleteSelectedCellsCommand
        } as const
        runCommand(map[kind])
      },
      insertLink: (text, href) => {
        const crepe = crepeRef.current
        if (!crepe) return
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { state } = view
          const linkMark = state.schema.marks.link
          if (!linkMark) return
          const { from, to, empty } = state.selection
          const tr = empty
            ? state.tr.insertText(text || href, from).addMark(
                from,
                from + (text || href).length,
                linkMark.create({ href })
              )
            : state.tr.addMark(from, to, linkMark.create({ href }))
          view.dispatch(tr)
          view.focus()
        })
      },
      insertImageFile: async (file) => {
        const crepe = crepeRef.current
        if (!crepe) return
        const src = await uploadImage(file)
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { state } = view
          const nodeType = state.schema.nodes['image-block'] ?? state.schema.nodes.image
          if (!nodeType) return
          const node = nodeType.createAndFill({ src })
          if (!node) return
          view.dispatch(state.tr.replaceSelectionWith(node))
          view.focus()
        })
      },
      openImagePicker: () => fileInputRef.current?.click(),
      flush: doSave,
      flushSync,
      getScrollTop: () => hostRef.current?.scrollTop ?? 0,
      getSelectedText: () => {
        const crepe = crepeRef.current
        if (!crepe) return ''
        let text = ''
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { from, to } = view.state.selection
          text = view.state.doc.textBetween(from, to, ' ')
        })
        return text
      }
    }),
    [doSave, flushSync, runCommand, uploadImage]
  )

  const handleClickCapture = useCallback(
    (e: React.MouseEvent): void => {
      const target = e.target as HTMLElement
      // Mermaid-Zoom: Lupen-Button oder ⌘-Klick auf das Diagramm
      const preview = target.closest('.mermaid-preview')
      if (preview && (target.closest('.mermaid-zoom-btn') || e.metaKey)) {
        const svg = preview.querySelector('svg')
        if (svg) {
          e.preventDefault()
          e.stopPropagation()
          void window.merkzeug.openMermaidZoom(svg.outerHTML)
          return
        }
      }
      const anchor = target.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      e.preventDefault()
      e.stopPropagation()
      onLinkClick(href)
    },
    [onLinkClick]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent): void => {
      const files = Array.from(e.clipboardData?.files ?? [])
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      const crepe = crepeRef.current
      if (!crepe) return
      void (async () => {
        for (const file of images) {
          const src = await uploadImage(file)
          crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            const { state } = view
            const nodeType = state.schema.nodes['image-block'] ?? state.schema.nodes.image
            if (!nodeType) return
            const node = nodeType.createAndFill({ src })
            if (node) view.dispatch(state.tr.replaceSelectionWith(node))
          })
        }
      })()
    },
    [uploadImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      const files = Array.from(e.dataTransfer?.files ?? [])
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      const crepe = crepeRef.current
      if (!crepe) return
      void (async () => {
        for (const file of images) {
          const src = await uploadImage(file)
          crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            const { state } = view
            const nodeType = state.schema.nodes['image-block'] ?? state.schema.nodes.image
            if (!nodeType) return
            const node = nodeType.createAndFill({ src })
            if (node) view.dispatch(state.tr.replaceSelectionWith(node))
          })
        }
      })()
    },
    [uploadImage]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      void (async () => {
        const crepe = crepeRef.current
        if (!crepe) return
        const src = await uploadImage(file)
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const { state } = view
          const nodeType = state.schema.nodes['image-block'] ?? state.schema.nodes.image
          if (!nodeType) return
          const node = nodeType.createAndFill({ src })
          if (node) view.dispatch(state.tr.replaceSelectionWith(node))
        })
      })()
    },
    [uploadImage]
  )

  if (loadError) {
    return <div className="editor-error">Datei konnte nicht geladen werden: {loadError}</div>
  }

  return (
    <div
      ref={hostRef}
      className="editor-host"
      onClickCapture={handleClickCapture}
      onPasteCapture={handlePaste}
      onDropCapture={handleDrop}
    >
      {reloadInfo && !conflict && (
        <div className="editor-notice">
          <span>
            Neu geladen um {reloadInfo} – die Datei wurde außerhalb dieses Fensters geändert.
          </span>
          <button title="Hinweis ausblenden" onClick={() => setReloadInfo(null)}>
            ✕
          </button>
        </div>
      )}
      {conflict && (
        <div className="editor-conflict">
          <span>Die Datei wurde außerhalb dieses Fensters geändert.</span>
          <button onClick={resolveConflictReload}>Neu laden</button>
          <button onClick={resolveConflictKeep}>Meine Version behalten</button>
        </div>
      )}
      <div className="frontmatter-bar">
        <div className="frontmatter-head">
          <button
            className="frontmatter-toggle"
            title={fmOpen ? 'Frontmatter zuklappen' : 'Frontmatter aufklappen'}
            onClick={() => setFmOpen((o) => !o)}
          >
            <span className={fmOpen ? 'frontmatter-chevron open' : 'frontmatter-chevron'}>▸</span>
            Frontmatter
          </button>
          {!readonly && (
            <div className="frontmatter-add" ref={fmMenuRef}>
              <button
                className="frontmatter-add-btn"
                title="Unterstütztes Feld einfügen"
                onClick={() => setFmMenuOpen((o) => !o)}
              >
                + Feld
              </button>
              {fmMenuOpen && (
                <div className="frontmatter-menu">
                  {FRONTMATTER_FIELDS.map((field) => {
                    const present = new RegExp(`^${field.key}[ \\t]*:`, 'm').test(fmText)
                    return (
                      <button
                        key={field.key}
                        className="frontmatter-menu-item"
                        disabled={present}
                        onClick={() => insertFmField(field.insert)}
                      >
                        <span className="frontmatter-menu-key">{field.key}</span>
                        <span className="frontmatter-menu-hint">
                          {present ? 'bereits vorhanden' : field.hint}
                        </span>
                      </button>
                    )
                  })}
                  <div className="frontmatter-menu-note">
                    Eigene Felder werden gespeichert, aber nicht ausgewertet.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {fmOpen && (
          <textarea
            ref={fmTextareaRef}
            className="frontmatter-input"
            value={fmText}
            onChange={handleFrontmatterChange}
            readOnly={readonly}
            spellCheck={false}
            rows={Math.min(12, Math.max(3, fmText.split('\n').length))}
            placeholder={'title: Mein Titel\ntags: [beispiel]'}
          />
        )}
      </div>
      <div ref={rootRef} className="editor-root" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  )
})

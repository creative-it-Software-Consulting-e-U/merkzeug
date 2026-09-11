import { t as translate } from '@merkzeug/core/i18n'
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
import { splitFrontmatter } from '@merkzeug/core/docTitle'
import { searchPlugin, searchPluginKey, type SearchMeta } from './searchPlugin'
import { renderMermaid } from './mermaid'
import { jumpToFragment } from './anchors'
import { isExternalLink } from '@merkzeug/core/paths'
import type { EditorHost, JumpTarget } from './host'
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
  /** Suchleiste öffnen (mit oder ohne Ersetzen-Zeile) */
  openSearch: (withReplace: boolean) => void
  /** aktuelle Scroll-Position des Editors (für die Tab-Historie) */
  getScrollTop: () => number
  /** Überschriften des Dokuments (für das Inhaltsverzeichnis-Dropdown) */
  getHeadings: () => { id: string; text: string; level: number }[]
  /** zur Überschrift springen (id oder Überschriftentext als Fragment) */
  jumpToHeading: (fragment: string) => void
}

export interface EditorProps {
  host: EditorHost
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
    hint: "Note title — used for {{titel}} in PDF exports"
  },
  {
    key: 'pdf-linked-title',
    insert: 'pdf-linked-title: ',
    hint: "Title for PDF exports with linked documents (overrides title:)"
  },
  {
    key: 'pdf-exclude',
    insert: 'pdf-exclude:\n  - ',
    hint: "Linked documents to exclude from the PDF export"
  },
  {
    key: 'pdf-toc',
    insert: 'pdf-toc: true',
    hint: "Add a table of contents before the PDF content (after the cover)"
  },
  {
    key: 'language',
    insert: "language: en",
    hint: "Document language, e.g. “en”: sets the PDF table of contents heading"
  }
]

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { host, filePath, loadToken, readonly, onLinkClick, jump, onDirtyChange, onSaved },
  ref
): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const mermaidSourcesRef = useRef(new Map<string, string>())
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const savingRef = useRef<Promise<void> | null>(null)
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
  // Suchen & Ersetzen: Leiste, Eingaben und Trefferstand
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchReplace, setSearchReplace] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [searchHits, setSearchHits] = useState({ count: 0, active: 0 })
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchOpenRef = useRef(false)
  searchOpenRef.current = searchOpen
  // Trefferzähler nach Dokumentänderungen aktualisieren (aus markdownUpdated)
  const searchSyncRef = useRef<() => void>(() => {})

  // Pfadwechsel ohne Neuladen (Umbenennen/Verschieben): nur Speicherziel anpassen
  filePathRef.current = filePath

  const doSave = useCallback(async (): Promise<void> => {
    if (savingRef.current) await savingRef.current
    if (conflictRef.current) throw new Error(translate("Resolve external changes before saving"))
    if (!dirtyRef.current || latestMarkdownRef.current === null) return
    const path = filePathRef.current
    const markdown = latestMarkdownRef.current
    const full = frontmatterRef.current + markdown
    const operation = host.writeFile(path, full)
    savingRef.current = operation
    try {
      await operation
      if (path !== filePathRef.current) return
      lastSavedRef.current = markdown
      lastDiskRef.current = full
      setSaveError(null)
      if (frontmatterRef.current + latestMarkdownRef.current === full) {
        dirtyRef.current = false
        onDirtyChange?.(false)
      }
      onSaved?.(markdown)
    } catch (error) {
      setSaveError(String(error))
      if (String(error).includes('CONFLICT')) {
        conflictRef.current = true
        setConflict(true)
      }
      throw error
    } finally {
      if (savingRef.current === operation) savingRef.current = null
    }
  }, [host, onDirtyChange, onSaved])

  const flushSync = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (conflictRef.current || !dirtyRef.current || latestMarkdownRef.current === null) return
    if (!host.writeFileSync) { void doSave().catch(() => {}); return }
    const full = frontmatterRef.current + latestMarkdownRef.current
    if (host.writeFileSync(filePathRef.current, full)) {
      dirtyRef.current = false
      lastSavedRef.current = latestMarkdownRef.current
      lastDiskRef.current = full
      onDirtyChange?.(false)
      onSaved?.(latestMarkdownRef.current)
    }
  }, [host, doSave, onDirtyChange, onSaved])

  const scheduleSave = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (host.saveDelayMs === 0) void doSave().catch(() => {})
    else saveTimerRef.current = setTimeout(() => void doSave().catch(() => {}), host.saveDelayMs ?? AUTOSAVE_MS)
  }, [host, doSave])

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
    let generation = 0
    const refresh = () => {
      const current = ++generation
      rootRef.current?.querySelectorAll<HTMLElement>('.mermaid-preview').forEach(preview => {
        const token = Array.from(preview.classList).find(name => name.startsWith('mermaid-source-'))
        const source = token ? mermaidSourcesRef.current.get(token) : undefined
        if (!source) return
        void renderMermaid(source, !!rootRef.current?.closest('.template-live')).then(svg => {
          if (current !== generation || !preview.isConnected) return
          const button = preview.querySelector('button')
          preview.innerHTML = svg
          if (button) preview.append(button)
        }).catch(() => {})
      })
    }
    let templateLive = !!rootRef.current?.closest('.template-live')
    const observer = new MutationObserver(() => {
      const next = !!rootRef.current?.closest('.template-live')
      if (next !== templateLive) { templateLive = next; refresh() }
    })
    for (let ancestor = rootRef.current?.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['class'] })
    }
    window.addEventListener('merkzeug-theme', refresh)
    return () => { generation++; observer.disconnect(); window.removeEventListener('merkzeug-theme', refresh) }
  }, [])

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
    return host.saveImage(filePathRef.current, btoa(binary), ext)
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

  const displayUrl = useCallback((url: string): string | Promise<string> => {
    return host.resolveImage(filePathRef.current, url)
  }, [host])

  /** Trefferanzeige aus dem Plugin-Zustand übernehmen */
  const syncSearchHits = useCallback((): void => {
    const crepe = crepeRef.current
    if (!crepe) return
    crepe.editor.action((ctx) => {
      const s = searchPluginKey.getState(ctx.get(editorViewCtx).state)
      setSearchHits({ count: s?.matches.length ?? 0, active: s?.activeIndex ?? 0 })
    })
  }, [])
  searchSyncRef.current = syncSearchHits

  const scrollToActiveMatch = useCallback((): void => {
    requestAnimationFrame(() => {
      rootRef.current?.querySelector('.search-match-active')?.scrollIntoView({ block: 'center' })
    })
  }, [])

  /** Suchbegriff bzw. aktiven Treffer ans Plugin melden */
  const dispatchSearch = useCallback(
    (meta: SearchMeta): void => {
      const crepe = crepeRef.current
      if (!crepe) return
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        view.dispatch(view.state.tr.setMeta(searchPluginKey, meta))
      })
      syncSearchHits()
      scrollToActiveMatch()
    },
    [scrollToActiveMatch, syncSearchHits]
  )

  const stepSearch = useCallback(
    (dir: 1 | -1): void => {
      const crepe = crepeRef.current
      if (!crepe) return
      let index: number | null = null
      crepe.editor.action((ctx) => {
        const s = searchPluginKey.getState(ctx.get(editorViewCtx).state)
        if (s && s.matches.length > 0) index = s.activeIndex + dir
      })
      if (index !== null) dispatchSearch({ activeIndex: index })
    },
    [dispatchSearch]
  )

  const closeSearch = useCallback((): void => {
    setSearchOpen(false)
    dispatchSearch({ query: '' })
    crepeRef.current?.editor.action((ctx) => ctx.get(editorViewCtx).focus())
  }, [dispatchSearch])

  const replaceCurrent = useCallback((): void => {
    const crepe = crepeRef.current
    if (!crepe || readonly) return
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const s = searchPluginKey.getState(view.state)
      const m = s?.matches[s.activeIndex]
      if (!m) return
      view.dispatch(view.state.tr.insertText(replaceText, m.from, m.to))
    })
    syncSearchHits()
    scrollToActiveMatch()
  }, [readonly, replaceText, scrollToActiveMatch, syncSearchHits])

  const replaceAll = useCallback((): void => {
    const crepe = crepeRef.current
    if (!crepe || readonly) return
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const s = searchPluginKey.getState(view.state)
      if (!s || s.matches.length === 0) return
      // rückwärts ersetzen, damit die vorderen Positionen gültig bleiben
      let tr = view.state.tr
      for (const m of [...s.matches].reverse()) tr = tr.insertText(replaceText, m.from, m.to)
      view.dispatch(tr)
    })
    syncSearchHits()
  }, [readonly, replaceText, syncSearchHits])

  const openSearchBar = useCallback(
    (withReplace: boolean): void => {
      setSearchOpen(true)
      setSearchReplace(withReplace)
      // aktuelle Auswahl (einzeilig) als Suchbegriff übernehmen
      let selected = ''
      crepeRef.current?.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { from, to } = view.state.selection
        selected = view.state.doc.textBetween(from, to, '\n')
      })
      const query = selected && !selected.includes('\n') ? selected : searchQuery
      if (query !== searchQuery) setSearchQuery(query)
      if (query) dispatchSearch({ query, activeIndex: 0 })
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      })
    },
    [dispatchSearch, searchQuery]
  )

  useEffect(() => {
    let cancelled = false
    let crepe: Crepe | null = null
    setLoadError(null)
    conflictRef.current = false
    setConflict(false)
    // Editor wird neu aufgebaut: der Suchzustand des Plugins geht verloren
    setSearchOpen(false)
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
        content = await host.readFile(filePathRef.current)
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
      mermaidSourcesRef.current.clear()

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
            text: translate("Start writing — type “/” for commands …"),
            mode: 'block'
          },
          [Crepe.Feature.LinkTooltip]: {
            inputPlaceholder: translate("Enter link …"),
            onCopyLink: () => undefined
          },
          [Crepe.Feature.CodeMirror]: {
            previewLabel: translate("Preview"),
            previewToggleButton: (previewOnly: boolean) =>
              previewOnly ? translate("Edit") : translate("Diagram"),
            previewOnlyByDefault: true,
            searchPlaceholder: translate("Search languages …"),
            noResultText: translate("No matches"),
            copyText: translate("Copy"),
            renderPreview: (language: string, content2: string, apply: (v: null | string | HTMLElement) => void) => {
              if (language !== 'mermaid' || !content2.trim()) return null
              const templateLive = !!rootRef.current?.closest('.template-live')
              renderMermaid(content2, templateLive)
                .then(async svg => {
                  // The mode can change while Mermaid is loading or rendering.
                  const current = !!rootRef.current?.closest('.template-live')
                  if (current !== templateLive) svg = await renderMermaid(content2, current)
                  // Kein addEventListener hier: Crepe sanitisiert die Vorschau
                  // (innerHTML), Listener gehen verloren. Klicks behandelt der
                  // Capture-Handler des Editors (handleClickCapture).
                  const wrap = document.createElement('div')
                  const token = `mermaid-source-${mermaidSourcesRef.current.size + 1}`
                  mermaidSourcesRef.current.set(token, content2)
                  wrap.className = `mermaid-preview ${token}`
                  wrap.innerHTML = svg
                  const zoomBtn = document.createElement('button')
                  zoomBtn.className = 'mermaid-zoom-btn'
                  zoomBtn.title = translate("Enlarge diagram")
                  zoomBtn.textContent = '🔍'
                  wrap.appendChild(zoomBtn)
                  apply(wrap)
                })
                .catch(() => {
                  const err = document.createElement('div')
                  err.className = 'mermaid-error'
                  err.textContent = translate("Could not render the Mermaid diagram.")
                  apply(err)
                })
            }
          },
          [Crepe.Feature.ImageBlock]: {
            proxyDomURL: displayUrl,
            onUpload: uploadImage,
            blockOnUpload: uploadImage,
            inlineOnUpload: uploadImage,
            blockUploadButton: translate("Choose image"),
            blockUploadPlaceholderText: translate("or paste an image URL"),
            inlineUploadButton: translate("Choose image"),
            inlineUploadPlaceholderText: translate("or paste an image URL"),
            blockConfirmButton: translate("Insert"),
            inlineConfirmButton: translate("Insert"),
            blockCaptionPlaceholderText: translate("Label")
          },
          [Crepe.Feature.BlockEdit]: {
            textGroup: {
              label: 'Text',
              text: { label: 'Text' },
              h1: { label: translate("Heading 1") },
              h2: { label: translate("Heading 2") },
              h3: { label: translate("Heading 3") },
              h4: { label: translate("Heading 4") },
              h5: { label: translate("Heading 5") },
              h6: { label: translate("Heading 6") },
              quote: { label: translate("Quote") },
              divider: { label: translate("Divider") }
            },
            listGroup: {
              label: translate("Lists"),
              bulletList: { label: translate("Bullet list") },
              orderedList: { label: translate("Numbered list") },
              taskList: { label: translate("Task list") }
            },
            advancedGroup: {
              label: translate("Insert"),
              image: { label: translate("Image") },
              codeBlock: { label: translate("Code block") },
              table: { label: translate("Table") }
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
      crepe.editor.use(searchPlugin)

      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          latestMarkdownRef.current = markdown
          if (searchOpenRef.current) searchSyncRef.current()
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
          void host.writeFile(
            filePathRef.current,
            frontmatterRef.current + latestMarkdownRef.current
          ).catch(error => { console.error(translate("Could not save when leaving the note"), error); host.onSaveError?.(String(error)) })
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
    const off = host.onVaultChanged?.((_vault, paths) => {
      if (conflictRef.current) return
      if (paths.length === 0 || !paths.includes(filePathRef.current)) return
      void (async () => {
        let disk: string
        try {
          disk = await host.readFile(filePathRef.current, { peek: true })
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
    void (async () => {
      // Refresh the host's revision before an explicit overwrite; a later race still conflicts.
      await host.readFile(filePathRef.current)
      conflictRef.current = false
      setConflict(false)
      await doSave()
    })().catch(error => setSaveError(String(error)))
  }, [host, doSave])

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
      console.warn(translate("Command failed"), err)
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
      getHeadings: () => {
        const root = rootRef.current
        if (!root) return []
        return [
          ...root.querySelectorAll<HTMLElement>('.ProseMirror :is(h1, h2, h3, h4, h5, h6)')
        ]
          .map((h) => ({
            id: h.id,
            text: h.textContent?.trim() ?? '',
            level: Number(h.tagName[1])
          }))
          .filter((h) => h.text)
      },
      jumpToHeading: (fragment) => {
        if (rootRef.current) jumpToFragment(rootRef.current, fragment)
      },
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
      },
      openSearch: openSearchBar
    }),
    [doSave, flushSync, openSearchBar, runCommand, uploadImage]
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
          void host.openMermaidZoom(svg.outerHTML)
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
    return <div className="editor-error">{translate("Could not load file:")} {loadError}</div>
  }

  return (
    <div
      ref={hostRef}
      className="editor-host"
      onClickCapture={handleClickCapture}
      onPasteCapture={handlePaste}
      onDropCapture={handleDrop}
    >
      {saveError && !conflict && <div role="alert" className="editor-conflict"><span>{translate("Save failed:")} {saveError}</span><button onClick={() => void doSave().catch(() => {})}>{translate("Try again")}</button></div>}
      {searchOpen && (
        <div className="search-anchor">
          <div className="search-bar">
            <div className="search-row">
              <input
                ref={searchInputRef}
                className="search-input"
                value={searchQuery}
                placeholder={translate("Search …")}
                spellCheck={false}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  dispatchSearch({ query: e.target.value, activeIndex: 0 })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    stepSearch(e.shiftKey ? -1 : 1)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    closeSearch()
                  }
                }}
              />
              <span className="search-count">
                {searchQuery === ''
                  ? ''
                  : searchHits.count === 0
                    ? translate("no matches")
                    : `${searchHits.active + 1} von ${searchHits.count}`}
              </span>
              <button
                className="search-btn"
                data-tip={translate("Previous match (⇧↩)")}
                disabled={searchHits.count === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => stepSearch(-1)}
              >
                ‹
              </button>
              <button
                className="search-btn"
                data-tip={translate("Next match (↩)")}
                disabled={searchHits.count === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => stepSearch(1)}
              >
                ›
              </button>
              <button
                className="search-btn"
                data-tip={translate("Close search (Esc)")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={closeSearch}
              >
                ✕
              </button>
            </div>
            {searchReplace && !readonly && (
              <div className="search-row">
                <input
                  className="search-input"
                  value={replaceText}
                  placeholder={translate("Replace with …")}
                  spellCheck={false}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      replaceCurrent()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      closeSearch()
                    }
                  }}
                />
                <button
                  className="search-action"
                  disabled={searchHits.count === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={replaceCurrent}
                >
                  {translate("Replace")}
                </button>
                <button
                  className="search-action"
                  data-tip={translate("Replace all matches")}
                  disabled={searchHits.count === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={replaceAll}
                >
                  {translate("All")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {reloadInfo && !conflict && (
        <div className="editor-notice">
          <span>
            {translate("Reloaded at")} {reloadInfo} {translate("— the file was changed outside this window.")}
          </span>
          <button title={translate("Dismiss notice")} onClick={() => setReloadInfo(null)}>
            ✕
          </button>
        </div>
      )}
      {conflict && (
        <div className="editor-conflict">
          <span>{translate("The file was changed outside this window.")}</span>
          <button onClick={resolveConflictReload}>{translate("Reload")}</button>
          <button onClick={resolveConflictKeep}>{translate("Keep my version")}</button>
        </div>
      )}
      <div className="frontmatter-bar">
        <div className="frontmatter-head">
          <button
            className="frontmatter-toggle"
            title={fmOpen ? translate("Collapse frontmatter") : translate("Expand frontmatter")}
            onClick={() => setFmOpen((o) => !o)}
          >
            <span className={fmOpen ? 'frontmatter-chevron open' : 'frontmatter-chevron'}>▸</span>
            Frontmatter
          </button>
          {!readonly && (
            <div className="frontmatter-add" ref={fmMenuRef}>
              <button
                className="frontmatter-add-btn"
                title={translate("Insert a supported field")}
                onClick={() => setFmMenuOpen((o) => !o)}
              >
                {translate("+ Field")}
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
                          {present ? translate("already exists") : translate(field.hint)}
                        </span>
                      </button>
                    )
                  })}
                  <div className="frontmatter-menu-note">
                    {translate("Custom fields are preserved but are not interpreted.")}
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
            placeholder={translate("title: My title\ntags: [example]")}
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

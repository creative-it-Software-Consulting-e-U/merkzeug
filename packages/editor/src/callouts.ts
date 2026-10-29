import { t as translate } from '@merkzeug/core/i18n'
import {
  calloutDefaultTitle,
  calloutKind,
  parseCalloutMarker,
  restoreCalloutMarker,
  type CalloutKind,
  type CalloutMarker
} from '@merkzeug/core/callouts'
import type { Ctx } from '@milkdown/kit/ctx'
import type { Editor } from '@milkdown/kit/core'
import { commandsCtx, editorViewCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import {
  blockquoteSchema,
  clearTextInCurrentBlockCommand,
  wrapInBlockTypeCommand
} from '@milkdown/kit/preset/commonmark'
import { Plugin, PluginKey, TextSelection, type EditorState } from '@milkdown/kit/prose/state'
import { findWrapping } from '@milkdown/kit/prose/transform'
import { Decoration, DecorationSet, type EditorView } from '@milkdown/kit/prose/view'
import type { Node } from '@milkdown/kit/prose/model'
import { $prose } from '@milkdown/kit/utils'

export interface CalloutOptions {
  /** Klappen per Klick und Marker beim Bearbeiten zeigen; aus für Druck/PDF */
  interactive: boolean
}

interface CalloutInfo {
  /** Position des Blockzitats */
  pos: number
  node: Node
  marker: CalloutMarker
  kind: CalloutKind
  markerFrom: number
  markerTo: number
  /** Ende der Titelzeile: erster Zeilenumbruch oder Ende des ersten Absatzes */
  titleTo: number
  /** Zeilenumbruch nach dem Titel, falls der Inhalt im selben Absatz weitergeht */
  breakPos: number | null
  paragraphEnd: number
  hasTitle: boolean
}

// 16×16-Strichsymbole im Stil von icons.tsx
const ICONS: Record<CalloutKind, string> = {
  note: '<path d="M10.5 2.5l3 3L6 13H3v-3z"/><path d="M9 4l3 3"/>',
  abstract: '<rect x="3.5" y="2.5" width="9" height="11.5" rx="1.5"/><path d="M6 2.5h4v2H6zM6 8h4M6 11h4"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.5V11M8 5h.01"/>',
  todo: '<circle cx="8" cy="8" r="6"/><path d="M5.5 8l1.8 1.8 3.2-3.3"/>',
  tip: '<path d="M8 14c2.5 0 4.5-1.8 4.5-4.3C12.5 6.5 9.5 5 9 2 7 3.5 6 5.2 6.4 7.2 5.5 6.8 5 6 5 5c-1 1-1.5 2.3-1.5 3.8C3.5 11.8 5.5 14 8 14z"/>',
  success: '<path d="M3 8.5l3.2 3.2L13 4.8"/>',
  question: '<circle cx="8" cy="8" r="6"/><path d="M6.2 6.3a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.6-1.8 2.7M8 11.8h.01"/>',
  warning: '<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3M8 11.3h.01"/>',
  failure: '<path d="M4 4l8 8M12 4l-8 8"/>',
  danger: '<path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z"/>',
  bug: '<rect x="5" y="5" width="6" height="8.5" rx="3"/><path d="M6 3.5L7 5M10 3.5L9 5M5 8H2.5M13.5 8H11M5 11H3M13 11h-2M8 7v6.5"/>',
  example: '<path d="M3 4h.01M3 8h.01M3 12h.01M6 4h7M6 8h7M6 12h7"/>',
  quote: '<path d="M3 13V9.5C3 6.5 4.5 4.5 7 3.5M3 9.5h3V13H3zM9 13V9.5c0-3 1.5-5 4-6M9 9.5h3V13H9z"/>'
}
const CHEVRON = '<path d="M4 6l4 4 4-4"/>'

function svg(paths: string): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}

const calloutCache = new WeakMap<Node, CalloutInfo[]>()

/** Alle Callouts des Dokuments (auch verschachtelte), je Dokumentstand gecacht. */
function findCallouts(doc: Node): CalloutInfo[] {
  const cached = calloutCache.get(doc)
  if (cached) return cached
  const found: CalloutInfo[] = []
  doc.descendants((node, pos) => {
    if (node.isTextblock) return false
    if (node.type.name !== 'blockquote') return true
    const paragraph = node.firstChild
    const first = paragraph?.type.name === 'paragraph' ? paragraph.firstChild : null
    const marker = first?.isText ? parseCalloutMarker(first.text ?? '') : null
    if (!paragraph || !marker) return true
    const contentFrom = pos + 2
    const contentTo = pos + paragraph.nodeSize
    let breakPos: number | null = null
    paragraph.forEach((child, offset) => {
      if (breakPos === null && child.type.name === 'hardbreak') breakPos = contentFrom + offset
    })
    const markerTo = contentFrom + marker.length
    const titleTo = breakPos ?? contentTo
    found.push({
      pos,
      node,
      marker,
      kind: calloutKind(marker.type),
      markerFrom: contentFrom,
      markerTo,
      titleTo,
      breakPos,
      paragraphEnd: contentTo + 1,
      hasTitle: doc.textBetween(Math.min(markerTo, titleTo), titleTo).trim() !== ''
    })
    return true
  })
  calloutCache.set(doc, found)
  return found
}

interface FoldState {
  /** vom Nutzer umgeschaltete Callouts (Position → eingeklappt); bleibt nur im Editor */
  toggled: Map<number, boolean>
}

const calloutKey = new PluginKey<FoldState>('merkzeug-callouts')

function isCollapsed(state: EditorState, callout: CalloutInfo, options: CalloutOptions): boolean {
  if (!options.interactive || callout.marker.fold === '') return false
  return calloutKey.getState(state)?.toggled.get(callout.pos) ?? callout.marker.fold === '-'
}

function toggle(view: EditorView, callout: CalloutInfo, options: CalloutOptions): void {
  const collapse = !isCollapsed(view.state, callout, options)
  const tr = view.state.tr.setMeta(calloutKey, { pos: callout.pos, collapsed: collapse })
  // Cursor nicht im verborgenen Inhalt zurücklassen
  const { from } = view.state.selection
  if (collapse && from > callout.titleTo && from < callout.pos + callout.node.nodeSize) {
    tr.setSelection(TextSelection.create(tr.doc, callout.titleTo))
  }
  view.dispatch(tr)
}

function widget(className: string, html: string, title?: string): HTMLElement {
  const el = document.createElement('span')
  el.className = className
  el.contentEditable = 'false'
  el.innerHTML = html
  if (title) el.title = title
  return el
}

function buildDecorations(state: EditorState, options: CalloutOptions): DecorationSet {
  const decorations: Decoration[] = []
  const { from, to } = state.selection
  for (const callout of findCallouts(state.doc)) {
    const collapsed = isCollapsed(state, callout, options)
    const foldable = options.interactive && callout.marker.fold !== ''
    const editing = options.interactive && from <= callout.titleTo && to >= callout.markerFrom
    const classes = ['callout']
    if (foldable) classes.push('callout-foldable')
    if (collapsed) classes.push('callout-collapsed')
    decorations.push(
      Decoration.node(callout.pos, callout.pos + callout.node.nodeSize, {
        class: classes.join(' '),
        'data-callout': callout.kind
      }),
      Decoration.widget(
        callout.markerFrom,
        () => widget('callout-icon', svg(ICONS[callout.kind])),
        { side: -1, key: `callout-icon-${callout.kind}` }
      ),
      Decoration.inline(callout.markerFrom, callout.markerTo, {
        class: editing ? 'callout-marker callout-marker-editing' : 'callout-marker'
      })
    )
    if (callout.titleTo > callout.markerTo) {
      decorations.push(Decoration.inline(callout.markerTo, callout.titleTo, { class: 'callout-title' }))
    }
    if (!callout.hasTitle) {
      decorations.push(
        Decoration.widget(
          callout.markerTo,
          () => {
            const el = widget('callout-title callout-default-title', '')
            el.textContent = calloutDefaultTitle(callout.marker.type)
            return el
          },
          { side: 1, key: `callout-default-${callout.marker.type}` }
        )
      )
    }
    if (foldable) {
      decorations.push(
        Decoration.widget(
          callout.titleTo,
          (view) => {
            const el = widget(
              'callout-fold',
              svg(CHEVRON),
              collapsed ? translate('Expand callout') : translate('Collapse callout')
            )
            el.addEventListener('mousedown', (event) => {
              event.preventDefault()
              event.stopPropagation()
              // das Widget wird über seinen Key wiederverwendet: aktuellen Stand nachschlagen
              const current = findCallouts(view.state.doc).find((c) => c.pos === callout.pos)
              if (current) toggle(view, current, options)
            })
            return el
          },
          {
            // ohne eigenen Titel hinter dem Standardtitel (side 1) einordnen
            side: callout.hasTitle ? -1 : 2,
            key: `callout-fold-${callout.pos}-${collapsed}`,
            stopEvent: () => true
          }
        )
      )
    }
    if (callout.breakPos !== null) {
      decorations.push(
        Decoration.node(callout.breakPos, callout.breakPos + 1, { class: 'callout-title-break' })
      )
      if (collapsed && callout.paragraphEnd - 1 > callout.breakPos) {
        decorations.push(
          Decoration.inline(callout.breakPos, callout.paragraphEnd - 1, { class: 'callout-hidden' })
        )
      }
    }
    if (collapsed) {
      callout.node.forEach((child, offset, index) => {
        if (index === 0) return
        const childPos = callout.pos + 1 + offset
        decorations.push(
          Decoration.node(childPos, childPos + child.nodeSize, { class: 'callout-hidden' })
        )
      })
    }
  }
  return DecorationSet.create(state.doc, decorations)
}

function calloutPlugin(options: CalloutOptions): Plugin<FoldState> {
  return new Plugin<FoldState>({
    key: calloutKey,
    state: {
      init: () => ({ toggled: new Map() }),
      apply(tr, value) {
        const meta = tr.getMeta(calloutKey) as { pos: number; collapsed: boolean } | undefined
        if (!meta && !tr.docChanged) return value
        const toggled = new Map<number, boolean>()
        for (const [pos, collapsed] of value.toggled) {
          const mapped = tr.mapping.mapResult(pos, 1)
          if (!mapped.deleted) toggled.set(mapped.pos, collapsed)
        }
        if (meta) toggled.set(meta.pos, meta.collapsed)
        return { toggled }
      }
    },
    props: {
      decorations: (state) => buildDecorations(state, options)
    }
  })
}

/**
 * Blockzitate wie remark-stringify serialisieren, aber den Callout-Marker
 * unmaskiert lassen (sonst würde aus `[!NOTE]` beim Speichern `\[!NOTE]`).
 */
const blockquoteHandler = (
  node: { children?: { type: string; children?: { type: string; value?: string }[] }[] },
  _parent: unknown,
  state: {
    enter: (name: string) => () => void
    createTracker: (info: unknown) => { move: (value: string) => string; shift: (n: number) => void; current: () => unknown }
    indentLines: (value: string, map: (line: string, index: number, blank: boolean) => string) => string
    containerFlow: (node: unknown, info: unknown) => string
  },
  info: unknown
): string => {
  const exit = state.enter('blockquote')
  const tracker = state.createTracker(info)
  tracker.move('> ')
  tracker.shift(2)
  const value = state.indentLines(
    state.containerFlow(node, tracker.current()),
    (line, _index, blank) => '>' + (blank ? '' : ' ') + line
  )
  exit()
  const first = node.children?.[0]
  const text = first?.type === 'paragraph' ? first.children?.[0] : undefined
  return text?.type === 'text' && parseCalloutMarker(text.value ?? '') ? restoreCalloutMarker(value) : value
}

/** Callouts im Editor bzw. in der Druckansicht aktivieren. */
export function enableCallouts(editor: Editor, options: CalloutOptions): void {
  editor.config((ctx) => {
    ctx.update(remarkStringifyOptionsCtx, (opts) => ({
      ...opts,
      handlers: { ...opts.handlers, blockquote: blockquoteHandler } as typeof opts.handlers
    }))
  })
  editor.use($prose(() => calloutPlugin(options)))
}

/** Menübeschriftung eines Typs mit Marker, z. B. „Warnung  [!warning]“. */
export function calloutLabel(type: string): string {
  const labels: Record<string, string> = {
    note: translate('Note'),
    tip: translate('Tip'),
    important: translate('Important'),
    warning: translate('Warning'),
    caution: translate('Caution'),
    info: translate('Info'),
    question: translate('Question'),
    example: translate('Example'),
    success: translate('Success'),
    danger: translate('Danger'),
    abstract: translate('Summary'),
    todo: translate('To-do'),
    failure: translate('Failure'),
    bug: translate('Bug'),
    quote: translate('Quote')
  }
  return `${labels[type] ?? calloutDefaultTitle(type)}  [!${type}]`
}

/** Symbol für das Slash-Menü (gefüllt wie die übrigen Crepe-Symbole). */
export const calloutMenuIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zm0 1.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 1 1 0-14.4zM11.1 10.5h1.8v6h-1.8zM11.1 7.5h1.8v1.8h-1.8z"/></svg>`

/** Aktuellen Block in einen Callout `> [!note] ` verwandeln; der Typ ist zum Überschreiben markiert. */
export function insertCallout(ctx: Ctx): void {
  const commands = ctx.get(commandsCtx)
  commands.call(clearTextInCurrentBlockCommand.key)
  commands.call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) })
  const view = ctx.get(editorViewCtx)
  const start = view.state.selection.from
  const tr = view.state.tr.insertText('[!note] ', start)
  view.dispatch(tr.setSelection(TextSelection.create(tr.doc, start + 2, start + 6)))
  view.focus()
}

/**
 * Toolbar: die markierten Blöcke in einen Callout `type` packen, dessen Inhalt
 * sie werden (`> [!type]` + Zeilenumbruch wie bei GitHub). Steht der Cursor
 * schon in einem Callout, wird nur dessen Typ geändert.
 */
export function wrapInCallout(view: EditorView, type: string): void {
  const { state } = view
  const { $from, $to, from } = state.selection
  const current = findCallouts(state.doc)
    .filter((c) => c.pos < from && from < c.pos + c.node.nodeSize)
    .pop()
  if (current) {
    const typeFrom = current.markerFrom + 2
    view.dispatch(state.tr.insertText(type, typeFrom, typeFrom + current.marker.type.length))
    view.focus()
    return
  }
  const blockquote = state.schema.nodes.blockquote
  const range = $from.blockRange($to)
  const wrapping = range && findWrapping(range, blockquote)
  if (!range || !wrapping) return
  const tr = state.tr.wrap(range, wrapping)
  const first = tr.doc.nodeAt(range.start + 1)
  const marker = state.schema.text(`[!${type}]`)
  if (first?.type.name === 'paragraph') {
    // weicher Zeilenumbruch: wird als `\n` gespeichert, der Text darunter ist der Inhalt
    tr.insert(range.start + 2, [marker, state.schema.nodes.hardbreak.create({ isInline: true })])
  } else {
    tr.insert(range.start + 1, state.schema.nodes.paragraph.create(null, marker))
  }
  view.dispatch(tr.scrollIntoView())
  view.focus()
}

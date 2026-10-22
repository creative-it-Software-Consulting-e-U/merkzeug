import {
  alignHtmlImages,
  htmlImageTag,
  parseHtmlImages,
  resizeHtmlImage,
  type HtmlImageBlock,
  type ImageAlign
} from '@merkzeug/core/htmlImages'
import type { ImageInsertMode } from '@merkzeug/core/imageInsert'
import type { Editor } from '@milkdown/kit/core'
import type { Node } from '@milkdown/kit/prose/model'
import { NodeSelection, Plugin, PluginKey, Selection, type Transaction } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'

/** Das ausgewählte Bild, an dem das Bild-Overlay hängt. */
export interface ImageTarget {
  pos: number
  /** 'html': `<img>`-Schnipsel; 'block'/'inline': Markdown-Bild als eigener Absatz bzw. im Text */
  kind: 'html' | 'block' | 'inline'
  /** angeklicktes Bild innerhalb eines HTML-Schnipsels */
  index: number
  /** einziger Inhalt seines Absatzes: nur dann sind Ausrichtung und Bild-Block möglich */
  alone: boolean
  src: string
  alt: string
  html?: string
  block?: HtmlImageBlock
}

const IMAGE_NODES = new Set(['image-block', 'image', 'html'])

function targetAt(view: EditorView, index: number): ImageTarget | null {
  const selection = view.state.selection
  if (!(selection instanceof NodeSelection)) return null
  const node = selection.node
  const pos = selection.from
  const parent = view.state.doc.resolve(pos).parent
  const alone = parent.type.name === 'paragraph' && parent.childCount === 1
  // leerer Platzhalter (Slash-Menü) zeigt Crepes eigene Auswahl für Datei oder Link
  if (node.type.name === 'image-block' && !node.attrs.src) return null
  if (node.type.name === 'image-block') {
    return { pos, kind: 'block', index: 0, alone: true, src: node.attrs.src, alt: node.attrs.caption ?? '' }
  }
  if (node.type.name === 'image') {
    return { pos, kind: 'inline', index: 0, alone, src: node.attrs.src, alt: node.attrs.alt ?? '' }
  }
  if (node.type.name !== 'html') return null
  const block = parseHtmlImages(node.attrs.value)
  if (!block) return null
  const chosen = Math.min(index, block.images.length - 1)
  const image = block.images[chosen]
  return { pos, kind: 'html', index: chosen, alone, src: image.src, alt: image.alt ?? '', html: node.attrs.value, block }
}

/** Meldet das ausgewählte Bild (oder `null`) nach jeder Änderung von Dokument oder Auswahl. */
export function enableImageOverlay(editor: Editor, onTarget: (view: EditorView, target: ImageTarget | null) => void): void {
  let clicked = 0
  editor.use($prose(() => new Plugin({
    key: new PluginKey('merkzeug-image-overlay'),
    props: {
      handleDOMEvents: {
        mousedown: (_view, event) => {
          const image = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('.html-images img')
          clicked = Number(image?.dataset.index ?? 0) || 0
          return false
        }
      }
    },
    view: (view) => {
      onTarget(view, targetAt(view, clicked))
      return {
        update: (next) => onTarget(next, targetAt(next, clicked)),
        destroy: () => onTarget(view, null)
      }
    }
  })))
}

/** Element des Bildes im Editor, für Position und natürliche Größe. */
export function targetImage(view: EditorView, target: ImageTarget): HTMLImageElement | null {
  const dom = view.nodeDOM(target.pos)
  if (!(dom instanceof HTMLElement)) return null
  if (dom instanceof HTMLImageElement) return dom
  return dom.querySelectorAll('img')[target.kind === 'html' ? target.index : 0] ?? null
}

function select(view: EditorView, tr: Transaction, pos: number): void {
  view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)).scrollIntoView())
}

function unchanged(view: EditorView, target: ImageTarget): Node | null {
  const node = view.state.doc.nodeAt(target.pos)
  if (!node || !IMAGE_NODES.has(node.type.name)) return null
  if (target.kind === 'html' && node.attrs.value !== target.html) return null
  return node
}

/** Bild zwischen Markdown-Bild und HTML-`<img>` umwandeln; Größe und Ausrichtung gehen dabei verloren. */
export function setImageEmbedding(view: EditorView, target: ImageTarget, html: boolean): void {
  const node = unchanged(view, target)
  if (!node || html === (target.kind === 'html')) return
  const { schema, tr } = view.state
  const alt = target.alt || undefined
  if (html) {
    const htmlNode = schema.nodes.html.create({ value: htmlImageTag({ src: target.src, alt }) })
    if (target.kind === 'block') {
      tr.replaceWith(target.pos, target.pos + node.nodeSize, schema.nodes.paragraph.create(null, htmlNode))
      select(view, tr, target.pos + 1)
    } else {
      tr.replaceWith(target.pos, target.pos + node.nodeSize, htmlNode)
      select(view, tr, target.pos)
    }
    return
  }
  const blockType = schema.nodes['image-block']
  if (target.alone && blockType) {
    const paragraph = target.pos - 1
    tr.replaceWith(paragraph, paragraph + node.nodeSize + 2, blockType.create({ src: target.src, caption: target.alt }))
    select(view, tr, paragraph)
  } else {
    tr.replaceWith(target.pos, target.pos + node.nodeSize, schema.nodes.image.create({ src: target.src, alt: target.alt }))
    select(view, tr, target.pos)
  }
}

/** Größe (leer: entfernen) und Ausrichtung eines HTML-Bildes ändern. */
export function updateHtmlImage(
  view: EditorView,
  target: ImageTarget,
  change: { width?: string; height?: string; align?: ImageAlign }
): void {
  const node = unchanged(view, target)
  if (!node || target.kind !== 'html' || !target.html) return
  let value = target.html
  if (change.width !== undefined || change.height !== undefined) {
    value = resizeHtmlImage(value, target.index, { width: change.width, height: change.height })
  }
  if (change.align && target.alone) value = alignHtmlImages(value, change.align)
  if (value === target.html) return
  const tr = view.state.tr.setNodeMarkup(target.pos, undefined, { ...node.attrs, value })
  select(view, tr, target.pos)
}

/** Neues Bild an der Auswahl einfügen und auswählen, damit das Overlay erscheint. */
export function insertImage(view: EditorView, src: string, mode: ImageInsertMode): void {
  const { schema } = view.state
  const blockType = schema.nodes['image-block'] ?? schema.nodes.image
  let node: Node | null = null
  if (mode === 'html' && schema.nodes.html) {
    node = schema.nodes.paragraph.create(null, schema.nodes.html.create({ value: htmlImageTag({ src }) }))
  } else if (blockType) {
    node = blockType.createAndFill({ src })
  }
  if (!node) return
  const tr = view.state.tr
  // Ein gerade ausgewähltes Bild (etwa beim Einfügen mehrerer Bilder) bleibt erhalten
  if (tr.selection instanceof NodeSelection && IMAGE_NODES.has(tr.selection.node.type.name)) {
    tr.setSelection(Selection.near(tr.doc.resolve(tr.selection.to), 1))
  }
  const start = tr.selection.from
  tr.replaceSelectionWith(node)
  let inserted = -1
  tr.doc.nodesBetween(tr.mapping.map(start, -1), Math.min(tr.doc.content.size, tr.mapping.map(start, 1) + node.nodeSize), (child, pos) => {
    if (inserted >= 0) return false
    if (child.type.name === 'html' && mode === 'html' && child.attrs.value === node.firstChild?.attrs.value) inserted = pos
    else if (child.type === blockType && child.attrs.src === src) inserted = pos
    return inserted < 0
  })
  if (inserted >= 0) tr.setSelection(NodeSelection.create(tr.doc, inserted))
  view.dispatch(tr.scrollIntoView())
}

/** Gerade hochgeladenes Markdown-Bild (Bild-Block mit `src`) in ein `<img>` umwandeln. */
export function embedBlockImage(view: EditorView, src: string): void {
  let pos = -1
  view.state.doc.descendants((node, at) => {
    if (pos < 0 && node.type.name === 'image-block' && node.attrs.src === src) pos = at
    return pos < 0
  })
  if (pos < 0) return
  const node = view.state.doc.nodeAt(pos)!
  setImageEmbedding(view, { pos, kind: 'block', index: 0, alone: true, src, alt: node.attrs.caption ?? '' }, true)
}

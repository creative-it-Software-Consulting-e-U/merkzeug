import { parseHtmlImages } from '@merkzeug/core/htmlImages'
import type { Editor } from '@milkdown/kit/core'
import type { Node } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { NodeView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'

/** Bildpfad wie bei Markdown-Bildern relativ zur Notiz auflösen. */
export type ImageResolver = (url: string) => string | Promise<string>

// Asynchron aufgelöste Bildquellen (iOS liest Dateien als data:-URL) – der PDF-Export wartet darauf
const pending = new Set<Promise<void>>()

/** Wartet, bis alle bisher angeforderten HTML-Bildquellen gesetzt sind. */
export async function htmlImagesResolved(): Promise<void> {
  while (pending.size > 0) await Promise.all([...pending])
}

/** Wie Milkdowns Standarddarstellung: der HTML-Quelltext als Text. */
function rawHtmlView(node: Node): NodeView {
  const dom = document.createElement('span')
  dom.dataset.type = 'html'
  dom.dataset.value = node.attrs.value
  dom.textContent = node.attrs.value
  return { dom }
}

function htmlNodeView(node: Node, resolve: ImageResolver): NodeView {
  const block = parseHtmlImages(node.attrs.value)
  if (!block) return rawHtmlView(node)
  const dom = document.createElement('span')
  dom.className = block.align === 'left' ? 'html-images' : `html-images html-images-${block.align}`
  // data-type/-value wie beim Standard-Knoten, damit Kopieren & Einfügen das HTML erhält
  dom.dataset.type = 'html'
  dom.dataset.value = node.attrs.value
  dom.contentEditable = 'false'
  for (const [index, image] of block.images.entries()) {
    const img = document.createElement('img')
    // welches Bild angeklickt wurde, braucht das Bild-Overlay
    img.dataset.index = String(index)
    if (image.alt !== undefined) img.alt = image.alt
    if (image.title !== undefined) img.title = image.title
    if (image.width !== undefined) img.setAttribute('width', image.width)
    if (image.height !== undefined) img.setAttribute('height', image.height)
    const src = resolve(image.src)
    if (typeof src === 'string') img.src = src
    else {
      const loading: Promise<void> = src
        .then((url) => { img.src = url })
        .catch(() => { img.alt = image.alt ?? image.src })
        .finally(() => pending.delete(loading))
      pending.add(loading)
    }
    dom.append(img)
  }
  return {
    dom,
    update: (next) => next.type === node.type && next.attrs.value === node.attrs.value,
    ignoreMutation: () => true
  }
}

/** `<img>`-HTML als Bild anzeigen; gespeichert wird weiterhin der unveränderte HTML-Text. */
export function enableHtmlImages(editor: Editor, resolve: ImageResolver): void {
  editor.use($prose(() => new Plugin({
    key: new PluginKey('merkzeug-html-images'),
    props: { nodeViews: { html: (node) => htmlNodeView(node, resolve) } }
  })))
}

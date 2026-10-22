/**
 * HTML-Bilder (`<img src="…" width="450">`) in Markdown. Merkzeug zeigt nur
 * reine Bild-Schnipsel an – optional in Hüllen wie `<p align="center">` oder
 * `<a href>` –, das HTML selbst bleibt beim Speichern unverändert.
 */

export interface HtmlImage {
  src: string
  alt?: string
  title?: string
  width?: string
  height?: string
}

export type ImageAlign = 'left' | 'center' | 'right'

export interface HtmlImageBlock {
  images: HtmlImage[]
  align: ImageAlign
  /** in einen Link gehüllt – als Markdown-Bild nicht ohne Verlust darstellbar */
  linked: boolean
}

const IMG = /<img\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/gi
const ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
// Hüllen, die um Bilder üblich sind (z. B. zentrierte Bilder in READMEs)
const WRAPPER = /<\/?(?:p|div|a|center|span|picture|figure|br)\b(?:[^>"']|"[^"]*"|'[^']*')*\/?>/gi
const COMMENT = /<!--[\s\S]*?-->/g
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[entity.toLowerCase()] ?? whole
  })
}

function attributes(source: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase()
    if (!result.has(name)) result.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''))
  }
  return result
}

/** Bilder eines HTML-Schnipsels, sofern er außer Bildern und Hüllen nichts enthält. */
export function parseHtmlImages(html: string): HtmlImageBlock | null {
  const images: HtmlImage[] = []
  for (const match of html.matchAll(IMG)) {
    const attrs = attributes(match[1])
    const src = attrs.get('src')
    if (!src) return null
    const image: HtmlImage = { src }
    for (const key of ['alt', 'title', 'width', 'height'] as const) {
      const value = attrs.get(key)
      if (value !== undefined) image[key] = value
    }
    images.push(image)
  }
  if (images.length === 0) return null
  const rest = html.replace(COMMENT, '').replace(IMG, '').replace(WRAPPER, '')
  if (rest.trim() !== '') return null
  const aligned = /<(?:p|div)\b[^>]*\balign\s*=\s*["']?(center|right|left)/i.exec(html)?.[1].toLowerCase()
  const align: ImageAlign = /<center\b/i.test(html) ? 'center' : aligned === 'center' || aligned === 'right' ? aligned : 'left'
  return { images, align, linked: /<a\b/i.test(html) }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Zulässige Größenangabe für `width`/`height`: Pixel oder Prozent. */
export function isImageSize(value: string): boolean {
  return /^\d{1,5}%?$/.test(value)
}

/** `<img>`-Tag für ein Bild; leere Angaben entfallen. */
export function htmlImageTag(image: HtmlImage): string {
  let tag = `<img src="${escapeAttribute(image.src)}"`
  for (const key of ['alt', 'title', 'width', 'height'] as const) {
    const value = image[key]
    if (value !== undefined && (value !== '' || key === 'alt')) tag += ` ${key}="${escapeAttribute(value)}"`
  }
  return tag + '>'
}

/** Breite/Höhe des `index`-ten Bildes setzen (leer: entfernen); übrige Attribute und Hüllen bleiben unverändert. */
export function resizeHtmlImage(html: string, index: number, size: { width?: string; height?: string }): string {
  let count = 0
  return html.replace(IMG, (tag, source: string) => {
    if (count++ !== index) return tag
    const pending = new Map(Object.entries(size).filter(([, value]) => value !== undefined) as [string, string][])
    const parts: string[] = []
    for (const match of source.matchAll(ATTRIBUTE)) {
      const name = match[1].toLowerCase()
      if (!pending.has(name)) { parts.push(match[0]); continue }
      const value = pending.get(name)!
      pending.delete(name)
      if (value) parts.push(`${name}="${escapeAttribute(value)}"`)
    }
    for (const [name, value] of pending) if (value) parts.push(`${name}="${escapeAttribute(value)}"`)
    const closing = /\/\s*$/.test(source) ? ' />' : '>'
    return `${tag.slice(0, 4)}${parts.map(part => ' ' + part).join('')}${closing}`
  })
}

const ALIGN_WRAPPER = /^\s*<(p|div)\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*)<\/\1>\s*$/i
const CENTER_WRAPPER = /^\s*<center>([\s\S]*)<\/center>\s*$/i

/** Schnipsel links (ohne Hülle), zentriert oder rechts (`<p align="…">`) ausrichten. */
export function alignHtmlImages(html: string, align: ImageAlign): string {
  const center = CENTER_WRAPPER.exec(html)
  let wrapper = center ? null : ALIGN_WRAPPER.exec(html)
  // `<p>…</p><p>…</p>` ist keine einzelne Hülle
  if (wrapper && new RegExp(`<${wrapper[1]}\\b`, 'i').test(wrapper[3])) wrapper = null
  if (wrapper) {
    const [, tag, source, inner] = wrapper
    const others = [...source.matchAll(ATTRIBUTE)].filter(match => match[1].toLowerCase() !== 'align').map(match => match[0])
    // Eigene Attribute der Hülle (class, style …) behalten; nur `align` ändern
    if (others.length > 0 || align !== 'left') return `<${tag}${[...others, ...(align === 'left' ? [] : [`align="${align}"`])].map(part => ' ' + part).join('')}>${inner}</${tag}>`
    return inner.trim()
  }
  const inner = center ? center[1].trim() : html.trim()
  if (align === 'left') return inner
  // Absätze dürfen keine Absätze enthalten
  const tag = /<(?:p|div)\b/i.test(inner) ? 'div' : 'p'
  return `<${tag} align="${align}">${inner}</${tag}>`
}

/** Positionen der `src`-Werte (ohne Anführungszeichen) aller `<img>`-Tags – für das Umschreiben beim Verschieben. */
export function htmlImageSources(html: string): { start: number; end: number; src: string }[] {
  const sources: { start: number; end: number; src: string }[] = []
  for (const tag of html.matchAll(IMG)) {
    const offset = tag.index + tag[0].indexOf(tag[1])
    for (const match of tag[1].matchAll(ATTRIBUTE)) {
      if (match[1].toLowerCase() !== 'src') continue
      const raw = match[2] ?? match[3] ?? match[4]
      if (raw === undefined) break
      const start = offset + match.index + match[0].length - raw.length - (match[4] === undefined ? 1 : 0)
      sources.push({ start, end: start + raw.length, src: decodeEntities(raw) })
      break
    }
  }
  return sources
}

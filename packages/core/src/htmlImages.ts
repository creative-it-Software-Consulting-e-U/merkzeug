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

export interface HtmlImageBlock {
  images: HtmlImage[]
  centered: boolean
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
  const centered = /<center\b/i.test(html) || /<(?:p|div)\b[^>]*\balign\s*=\s*["']?center/i.test(html)
  return { images, centered }
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

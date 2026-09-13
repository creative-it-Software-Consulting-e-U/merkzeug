import type { PdfTemplate } from './pdf'

const mime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' }
export async function loadTemplateFiles(name: string, read: (path: string) => Promise<string | undefined>): Promise<PdfTemplate> {
  const part = async (path: string) => {
    const bytes = await read(path)
    if (bytes === undefined) return undefined
    let text = new TextDecoder().decode(Uint8Array.from(atob(bytes), c => c.charCodeAt(0)))
    const refs = new Set<string>()
    const replacements = new Map<string, string>()
    for (const match of text.matchAll(/(?:src=["']([^"']+)["']|url\(\s*["']?([^\s)"']+)["']?\s*\))/gi)) refs.add(match[1] ?? match[2])
    for (const ref of refs) {
      if (/^(?:data:|https?:)/i.test(ref)) continue
      const path = decodeURI(ref), type = mime[path.split('.').pop()?.toLowerCase() ?? '']
      if (!type || path.startsWith('/') || path.split(/[\\/]/).includes('..')) continue
      const data = await read(path)
      if (data !== undefined) replacements.set(ref, `data:${type};base64,${data}`)
    }
    return text.replace(/(src=)(["'])([^"']+)\2/gi, (whole, attr, quote, ref) => replacements.has(ref) ? `${attr}${quote}${replacements.get(ref)}${quote}` : whole)
      .replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (whole, quote, ref) => replacements.has(ref.trim()) ? `url(${quote}${replacements.get(ref.trim())}${quote})` : whole)
  }
  const [header, footer, cover, css, config] = await Promise.all(['kopfzeile.html', 'fusszeile.html', 'deckblatt.html', 'stil.css', 'vorlage.json'].map(part))
  const margins = { top: 24, bottom: 18, left: 10, right: 10 }
  const configured = config ? JSON.parse(config).margins : undefined
  if (configured) for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    if (Number.isFinite(configured[side]) && configured[side] >= 0) margins[side] = configured[side]
  }
  return { name, header, footer, cover, css, margins: configured || header || footer ? margins : undefined }
}

import { frontmatterList, pdfExportTitle, splitFrontmatter } from './docTitle.ts'
import type { PdfTemplate } from './pdf.ts'

/** Canonical logical paths. Hosts translate these to local paths or workspace URIs. */
export function resolvePath(base: string, relative: string): string {
  const input = (base + '/' + relative).replace(/\\/g, '/')
  const parts: string[] = []
  for (const part of input.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return (input.startsWith('/') ? '/' : '') + parts.join('/')
}

/** Same selection policy as the desktop: direct links below the index's folder. */
export async function collectLinkedDocs(
  indexPath: string, markdown: string, vault: string | null,
  exists: (path: string) => Promise<boolean>
): Promise<string[]> {
  indexPath = indexPath.replace(/\\/g, '/')
  const dir = indexPath.slice(0, indexPath.lastIndexOf('/'))
  const resolve = (target: string): string => {
    const raw = decodeURI(target).replace(/[?#].*$/, '')
    return resolvePath(raw.startsWith('/') && vault ? vault : dir, raw)
  }
  const exclusions = new Set(frontmatterList(splitFrontmatter(markdown).frontmatter, 'pdf-exclude').map((target) => {
    const path = resolve(target)
    return /\.md$/i.test(path) ? path : path + '.md'
  }))
  const content = markdown.replace(/(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[^\n]*/g, '').replace(/`[^`\n]*`/g, '')
  const targets = [
    ...[...content.matchAll(/(!?)\[[^\]]*\]\(\s*<?([^)>\s]+)>?[^)]*\)/g)].filter(m => !m[1]).map(m => m[2]),
    ...[...content.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)].map(m => m[1])
  ]
  const found = new Set<string>()
  for (const target of targets) {
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue
    let path: string
    try { path = resolve(target) } catch { continue }
    if (!/\.md$/i.test(path)) path += '.md'
    if (path === indexPath || !path.startsWith(dir + '/') || exclusions.has(path)) continue
    if (await exists(path)) found.add(path)
  }
  return [...found].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
}

export function fillTemplate(template: PdfTemplate, markdown: string, fallback: string, linked: boolean, date: Date = new Date()): PdfTemplate {
  const title = pdfExportTitle(markdown, fallback, linked)
  const escaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fill = (part?: string) => part?.split('{{titel}}').join(escaped).split('{{datum}}').join(day)
  return { ...template, header: fill(template.header), footer: fill(template.footer), cover: fill(template.cover) }
}

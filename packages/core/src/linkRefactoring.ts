import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'

export interface PathMove { from: string; to: string }
export interface LinkEdit { path: string; target: string; before: string; after: string }
/** Paths use slash separators, relative to a vault (or a common filesystem root). */
export function normalizeLinkPath(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return '/' + parts.join('/')
}
export function movedLinkPath(path: string, moves: PathMove[]): string {
  const move = [...moves].sort((a, b) => b.from.length - a.from.length).find(m => path === m.from || path.startsWith(m.from + '/'))
  return move ? move.to + path.slice(move.from.length) : path
}
const directory = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/'
function relative(from: string, to: string): string {
  const a = from.split('/').filter(Boolean), b = to.split('/').filter(Boolean)
  while (a.length && b.length && a[0] === b[0]) { a.shift(); b.shift() }
  return [...a.map(() => '..'), ...b].join('/') || '.'
}
export function rewriteLinkDestination(url: string, source: string, moves: PathMove[], root = '/'): string {
  if (!url || /^(?:[a-z][a-z\d+.-]*:|#|\?|\/\/)/i.test(url)) return url
  const split = url.search(/[?#]/), path = split < 0 ? url : url.slice(0, split), suffix = split < 0 ? '' : url.slice(split)
  let decoded: string
  try { decoded = decodeURIComponent(path) } catch { return url }
  const absolute = normalizeLinkPath(path.startsWith('/') ? root + '/' + decoded : directory(source) + '/' + decoded)
  const vault = normalizeLinkPath(root)
  if (vault !== '/' && absolute !== vault && !absolute.startsWith(vault + '/')) return url
  const target = movedLinkPath(absolute, moves), newSource = movedLinkPath(source, moves)
  if (target === absolute && directory(newSource) === directory(source)) return url
  let result = path.startsWith('/') ? '/' + relative(vault, target) : relative(directory(newSource), target)
  if (path.startsWith('./') && !result.startsWith('.')) result = './' + result
  return result.split('/').map(segment => encodeURIComponent(segment).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/') + suffix
}

/** Locate only the destination in a parsed Markdown link/definition; preserve all other bytes. */
function destinationSpan(raw: string, definition: boolean): [number, number] | null {
  let start = -1, depth = 0, escaped = false
  for (let i = raw.indexOf('['); i >= 0 && i < raw.length; i++) {
    const c = raw[i]
    if (escaped) { escaped = false; continue }
    if (c === '\\') { escaped = true; continue }
    if (c === '[') depth++
    if (c === ']' && --depth === 0) {
      if (raw[i + 1] !== (definition ? ':' : '(')) return null
      start = i + 2; break
    }
  }
  if (start < 0) return null
  while (/\s/.test(raw[start] ?? '') && start < raw.length) start++
  const angle = raw[start] === '<'; if (angle) start++
  depth = 0; escaped = false
  for (let end = start; end < raw.length; end++) {
    const c = raw[end]
    if (escaped) { escaped = false; continue }
    if (c === '\\') { escaped = true; continue }
    if (angle ? c === '>' : /\s/.test(c) || (c === ')' && depth === 0)) return [start, end]
    if (!angle && c === '(') depth++
    if (!angle && c === ')') depth--
  }
  return [start, raw.length]
}
export function rewriteMarkdownLinks(text: string, source: string, moves: PathMove[], root = '/'): string {
  // Frontmatter is metadata, not Markdown; retain offsets while excluding it from parsing.
  const input = text.replace(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/, block => block.replace(/[^\r\n]/g, ' '))
  const edits: { start: number; end: number; value: string }[] = []
  function visit(node: Nodes): void {
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
      const value = rewriteLinkDestination(node.url, source, moves, root)
      if (value !== node.url && node.position) {
        const offset = node.position.start.offset!, raw = text.slice(offset, node.position.end.offset!)
        const span = destinationSpan(raw, node.type === 'definition')
        if (span) edits.push({ start: offset + span[0], end: offset + span[1], value })
      }
    }
    if ('children' in node) node.children.forEach(visit)
  }
  visit(fromMarkdown(input))
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.value + text.slice(edit.end)
  return text
}
export function planLinkEdits(files: { path: string; content: string }[], moves: PathMove[], root = '/'): LinkEdit[] {
  return files.flatMap(({ path, content }) => {
    const after = rewriteMarkdownLinks(content, path, moves, root)
    return after === content ? [] : [{ path, target: movedLinkPath(path, moves), before: content, after }]
  })
}

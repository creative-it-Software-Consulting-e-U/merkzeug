import * as vscode from 'vscode'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { getLocale, setLocale, t } from '@merkzeug/core/i18n'

/** Slash-separated paths, as exchanged with the shared web shell (Windows: `C:/…`). */
export const slash = (value: string) => value.replace(/\\/g, '/')
export const stem = (name: string) => { const dot = name.lastIndexOf('.'); return dot < 0 ? name : name.slice(0, dot) }
export const exists = (value: string) => fs.lstat(value).then(() => true, () => false)

/**
 * Like the IntelliJ plugin: German on German systems. A non-English VS Code display
 * language wins; otherwise VS Code's reported OS locale decides.
 */
export function initializeLocale(): string {
  let locale = vscode.env.language
  if (!locale || /^en\b/i.test(locale)) {
    try { locale = JSON.parse(process.env.VSCODE_NLS_CONFIG ?? '{}').osLocale || locale } catch { /* Keep the display language. */ }
  }
  setLocale(locale || 'en')
  return getLocale()
}
export { t }
export const getLocaleTag = () => getLocale()

/** The workspace folder containing the note, otherwise the note's folder. */
export function rootOf(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri)
  return folder && folder.uri.scheme === 'file' ? folder.uri.fsPath : path.dirname(uri.fsPath)
}

const inside = (child: string, parent: string) => {
  const relative = path.relative(parent, child)
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

/** Resolve symbolic links and reject anything outside the note's root, including new files. */
export async function allowed(root: string, value: string): Promise<string> {
  const candidate = path.resolve(value)
  const real = await exists(candidate) ? await fs.realpath(candidate) : path.join(await fs.realpath(path.dirname(candidate)), path.basename(candidate))
  if (!inside(real, await fs.realpath(root))) throw new Error(t('File is outside the open project: ') + path.basename(candidate))
  return real
}
export async function isInside(root: string, value: string): Promise<boolean> {
  try { return inside(await fs.realpath(value), await fs.realpath(root)) } catch { return false }
}

export function mime(file: string): string {
  const types: Record<string, string> = {
    mp4: 'video/mp4', html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json',
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    bmp: 'image/bmp', avif: 'image/avif', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf'
  }
  return types[file.slice(file.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'
}

/** Minimal replacement keeps markers, selections and undo granularity in other editors. */
export function minimalEdit(document: vscode.TextDocument, next: string): { range: vscode.Range; text: string } | undefined {
  const previous = document.getText()
  if (previous === next) return undefined
  let start = 0
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++
  let oldEnd = previous.length, newEnd = next.length
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd-- }
  // Never split a CRLF pair or a surrogate pair.
  const low = (value: string, index: number) => /[\uDC00-\uDFFF]/.test(value[index] ?? '')
  while (start > 0 && (previous[start - 1] === '\r' || low(previous, start))) start--
  while (oldEnd < previous.length && (previous[oldEnd] === '\n' && previous[oldEnd - 1] === '\r' || low(previous, oldEnd))) { oldEnd++; newEnd++ }
  return { range: new vscode.Range(document.positionAt(start), document.positionAt(oldEnd)), text: next.slice(start, newEnd) }
}

export function withEol(document: vscode.TextDocument, text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  return document.eol === vscode.EndOfLine.CRLF ? normalized.replace(/\n/g, '\r\n') : normalized
}

import { randomUUID } from 'node:crypto'
import { planLinkEdits } from '@merkzeug/core/linkRefactoring'
import { t as translate } from '@merkzeug/core/i18n'
import { shell } from 'electron'
import {
  readFileSync,
  readdirSync, lstatSync, accessSync, constants, unlinkSync, realpathSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  statSync
} from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, dirname, basename, extname, resolve, sep, relative, isAbsolute } from 'node:path'
import type { FileNode } from '../shared/types'
import { isIgnoredDir } from './ignore'

/** Name des Ressourcen-Ordners zu einer Notiz: "Notizname.assets" */
export function assetsDirFor(notePath: string): string {
  const dir = dirname(notePath)
  const base = basename(notePath, extname(notePath))
  return join(dir, `${base}.assets`)
}

export function isAssetsDir(name: string): boolean {
  return name.endsWith('.assets')
}

export async function readTree(root: string): Promise<FileNode> {
  const build = async (dir: string): Promise<FileNode[]> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const nodes: FileNode[] = []
    for (const entry of entries) {
      const { name } = entry
      if (name.startsWith('.')) continue
      const full = join(dir, name)
      let isDirectory = entry.isDirectory()
      let isFile = entry.isFile()
      if (entry.isSymbolicLink()) {
        try {
          const stat = statSync(full)
          isDirectory = stat.isDirectory()
          isFile = stat.isFile()
        } catch {
          continue
        }
      }
      if (isDirectory) {
        if (isIgnoredDir(full)) continue
        nodes.push({ name, path: full, isDirectory: true, children: await build(full) })
      } else if (isFile) {
        nodes.push({ name, path: full, isDirectory: false })
      }
    }
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    })
    return nodes
  }
  return { name: basename(root), path: root, isDirectory: true, children: await build(root) }
}

export function readTextFile(path: string): string {
  return readFileSync(path, 'utf8')
}

export function writeTextFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
}

function uniquePath(dir: string, base: string, ext: string): string {
  let candidate = join(dir, `${base}${ext}`)
  let n = 2
  while (existsSync(candidate)) {
    candidate = join(dir, `${base} ${n}${ext}`)
    n += 1
  }
  return candidate
}

export function createNote(dir: string): string {
  const path = uniquePath(dir, translate("New note"), '.md')
  writeFileSync(path, '', 'utf8')
  return path
}

/**
 * Legt eine Notiz mit vorgegebenem Namen und Inhalt an (z. B. Meeting-Notiz).
 * Bei Namenskollision wird " 2", " 3", … angehängt. Liefert den Pfad.
 */
export function createNoteFrom(dir: string, base: string, content: string): string {
  const safeBase = base.replace(/[/\\:]/g, '-').trim() || translate("New note")
  const path = uniquePath(dir, safeBase, '.md')
  writeFileSync(path, content, 'utf8')
  return path
}

export function createFolder(dir: string): string {
  const path = uniquePath(dir, translate("New folder"), '')
  mkdirSync(path)
  return path
}

/**
 * Benennt eine Notiz automatisch nach ihrem Titel-Slug um. Kollidiert der
 * Name mit einer anderen Datei, wird "-2", "-3", … angehängt.
 * Liefert den neuen Pfad (bzw. den alten, wenn er schon passt).
 */
export function autoRenameNote(path: string, base: string, root = dirname(path)): string {
  const dir = dirname(path)
  if (basename(path, '.md') === base) return path
  let candidate = base
  let n = 2
  while (join(dir, `${candidate}.md`) !== path && (existsSync(join(dir, `${candidate}.md`)) || existsSync(join(dir, `${candidate}.assets`)))) {
    candidate = `${base}-${n}`
    n += 1
  }
  return join(dir, `${candidate}.md`) === path ? path : renamePath(path, `${candidate}.md`, root)
}

function writeRefactoredFile(path: string, text: string): void {
  const temporary = join(dirname(path), `.merkzeug-refactor-${randomUUID()}.tmp`)
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', flag: 'wx', mode: statSync(path).mode })
    renameSync(temporary, path)
  } finally { if (existsSync(temporary)) unlinkSync(temporary) }
}

/** Rename/move and all affected Markdown destinations form one recoverable operation. */
export function refactorPath(source: string, target: string, root: string): string {
  source = resolve(source); target = resolve(target); root = resolve(root)
  if (source === target) return source
  const contained = (base: string, p: string) => { const rel = relative(base, p); return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel) }
  if (source === root || ![source, target].every(p => contained(root, p))) throw new Error(translate('Path is outside the vault'))
  if (!contained(realpathSync(root), realpathSync(source)) || !contained(realpathSync(root), realpathSync(dirname(target)))) throw new Error(translate('Path is outside the vault'))
  if (lstatSync(source).isSymbolicLink()) throw new Error(translate('Review symbolic links manually'))
  if (lstatSync(source).isDirectory() && target.startsWith(source + sep)) throw new Error(translate('A folder cannot be moved into itself.'))
  const pairs = [{ from: source, to: target }]
  if (!lstatSync(source).isDirectory() && extname(source).toLowerCase() === '.md' && existsSync(assetsDirFor(source))) pairs.push({ from: assetsDirFor(source), to: assetsDirFor(target) })
  for (const pair of pairs) {
    if (existsSync(pair.to)) throw new Error(translate('Already exists: “') + basename(pair.to) + '”.')
    if (lstatSync(pair.from).isSymbolicLink()) throw new Error(translate('Review symbolic links manually'))
    accessSync(dirname(pair.from), constants.W_OK); accessSync(dirname(pair.to), constants.W_OK)
  }
  const slash = (p: string) => { const value = p.replaceAll('\\', '/'); return value.startsWith('/') ? value : '/' + value }
  const native = (p: string) => process.platform === 'win32' && /^\/[A-Za-z]:\//.test(p) ? p.slice(1) : p
  const files: { path: string; content: string }[] = []
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) { if (!entry.name.startsWith('.') && !isIgnoredDir(path)) scan(path) }
      else if (/\.md$/i.test(entry.name)) files.push({ path: slash(path), content: readFileSync(path, 'utf8') })
    }
  }
  scan(root)
  const edits = planLinkEdits(files, pairs.map(p => ({ from: slash(p.from), to: slash(p.to) })), slash(root)).map(edit => ({ ...edit, path: native(edit.path), target: native(edit.target) }))
  for (const edit of edits) {
    accessSync(edit.path, constants.W_OK)
    if (readFileSync(edit.path, 'utf8') !== edit.before) throw new Error('CONFLICT: ' + translate('File changed during refactoring'))
  }
  const moved: typeof pairs = [], written: typeof edits = []
  try {
    for (const pair of pairs) { renameSync(pair.from, pair.to); moved.push(pair) }
    for (const edit of edits) {
      if (readFileSync(edit.target, 'utf8') !== edit.before) throw new Error('CONFLICT: ' + translate('File changed during refactoring'))
      writeRefactoredFile(edit.target, edit.after); written.push(edit)
    }
  } catch (error) {
    const failures: unknown[] = []
    for (const edit of written.reverse()) {
      try {
        if (readFileSync(edit.target, 'utf8') !== edit.after) throw new Error(translate('Concurrent modification: ') + edit.target)
        writeRefactoredFile(edit.target, edit.before)
      } catch (e) { failures.push(e) }
    }
    for (const pair of moved.reverse()) {
      try { if (existsSync(pair.from)) throw new Error(translate('Recovery destination exists: ') + pair.from); renameSync(pair.to, pair.from) } catch (e) { failures.push(e) }
    }
    if (failures.length) throw new AggregateError([error, ...failures], translate('Refactoring failed; some files require recovery'))
    throw error
  }
  return target
}
export function renamePath(path: string, newName: string, root = dirname(path)): string {
  if (!newName || /[/\\]/.test(newName) || newName === '.' || newName === '..') throw new Error(translate('Invalid filename'))
  if (!lstatSync(path).isDirectory() && /\.md$/i.test(path) && !/\.md$/i.test(newName)) newName += '.md'
  return refactorPath(path, join(dirname(path), newName), root)
}
export function movePath(src: string, destDir: string, root = dirname(src)): string {
  return refactorPath(src, join(destDir, basename(src)), root)
}

/** Legt Datei/Ordner in den Papierkorb; bei Notizen auch den Assets-Ordner. */
export async function trashPath(path: string): Promise<void> {
  await shell.trashItem(path)
  if (extname(path) === '.md') {
    const assets = assetsDirFor(path)
    if (existsSync(assets)) await shell.trashItem(assets)
  }
}

/**
 * Speichert Bilddaten in den Assets-Ordner der Notiz und liefert den
 * Markdown-tauglichen relativen Pfad (URL-codiert).
 */
export function saveImage(notePath: string, base64: string, ext: string): string {
  const assets = assetsDirFor(notePath)
  mkdirSync(assets, { recursive: true })
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'
  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, '-')
    .replace(/\..+$/, '')
  let name = `Bild-${stamp}.${cleanExt}`
  let n = 2
  while (existsSync(join(assets, name))) {
    name = `Bild-${stamp}-${n}.${cleanExt}`
    n += 1
  }
  writeFileSync(join(assets, name), Buffer.from(base64, 'base64'))
  return `${encodeURI(basename(assets))}/${encodeURI(name)}`
}

import { shell } from 'electron'
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  statSync
} from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, dirname, basename, extname, resolve, sep } from 'node:path'
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
  const path = uniquePath(dir, 'Neue Notiz', '.md')
  writeFileSync(path, '', 'utf8')
  return path
}

export function createFolder(dir: string): string {
  const path = uniquePath(dir, 'Neuer Ordner', '')
  mkdirSync(path)
  return path
}

/**
 * Benennt eine Notiz automatisch nach ihrem Titel-Slug um. Kollidiert der
 * Name mit einer anderen Datei, wird "-2", "-3", … angehängt.
 * Liefert den neuen Pfad (bzw. den alten, wenn er schon passt).
 */
export function autoRenameNote(path: string, base: string): string {
  const dir = dirname(path)
  if (basename(path, '.md') === base) return path
  let candidate = base
  let n = 2
  while (existsSync(join(dir, `${candidate}.md`))) {
    candidate = `${base}-${n}`
    n += 1
  }
  return renamePath(path, `${candidate}.md`)
}

/** Ersetzt Verweise auf den alten Assets-Ordner in einer Notiz (auch URL-codiert). */
function rewriteAssetLinks(content: string, oldBase: string, newBase: string): string {
  const variants: Array<[string, string]> = [
    [`${oldBase}.assets/`, `${newBase}.assets/`],
    [`${encodeURI(oldBase)}.assets/`, `${encodeURI(newBase)}.assets/`]
  ]
  let result = content
  for (const [from, to] of variants) {
    result = result.split(from).join(to)
  }
  return result
}

/**
 * Benennt Datei oder Ordner um. Bei Notizen wird der Assets-Ordner mit
 * umbenannt und die Bildpfade in der Notiz werden angepasst.
 * Liefert den neuen Pfad.
 */
export function renamePath(path: string, newName: string): string {
  const dir = dirname(path)
  const stat = statSync(path)
  if (stat.isDirectory() || extname(path) !== '.md') {
    const target = join(dir, newName)
    if (existsSync(target)) throw new Error(`Es existiert bereits „${newName}“.`)
    renameSync(path, target)
    return target
  }
  const oldBase = basename(path, '.md')
  const newBase = newName.endsWith('.md') ? basename(newName, '.md') : newName
  const target = join(dir, `${newBase}.md`)
  if (target === path) return path
  if (existsSync(target)) throw new Error(`Es existiert bereits „${newBase}.md“.`)
  renameSync(path, target)
  const oldAssets = join(dir, `${oldBase}.assets`)
  if (existsSync(oldAssets)) {
    const newAssets = join(dir, `${newBase}.assets`)
    renameSync(oldAssets, newAssets)
    const content = readFileSync(target, 'utf8')
    const rewritten = rewriteAssetLinks(content, oldBase, newBase)
    if (rewritten !== content) writeFileSync(target, rewritten, 'utf8')
  }
  return target
}

/** Verschiebt Datei/Ordner in einen Zielordner; Assets-Ordner wandert mit. */
export function movePath(src: string, destDir: string): string {
  const name = basename(src)
  const target = join(destDir, name)
  if (resolve(src) === resolve(target)) return src
  if (existsSync(target)) throw new Error(`Im Zielordner existiert bereits „${name}“.`)
  const srcStat = statSync(src)
  if (srcStat.isDirectory() && (resolve(destDir) + sep).startsWith(resolve(src) + sep)) {
    throw new Error('Ein Ordner kann nicht in sich selbst verschoben werden.')
  }
  renameSync(src, target)
  if (extname(src) === '.md') {
    const assets = assetsDirFor(src)
    if (existsSync(assets)) {
      renameSync(assets, join(destDir, basename(assets)))
    }
  }
  return target
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

/**
 * File access of the AI assistant inside one vault. Every path comes from the
 * model and is untrusted: it is resolved below the vault root, symbolic links
 * must not lead outside, hidden and ignored folders stay out, and only text
 * files are read or written. Changed files keep their original content so the
 * panel can undo a whole answer.
 *
 * No relative imports: the tests load this module directly.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { isTextPath, type VaultAccess, type VaultToolCall } from '@merkzeug/core/assistantTools'

export interface ToolOutcome {
  content: string
  isError: boolean
}

export type VaultActivity =
  | { kind: 'list' | 'search' | 'read' | 'write' | 'denied'; path: string; detail?: string }
  | { kind: 'needsWrite'; path: ''; detail: string }

export interface FileChange {
  /** relative to the vault root, `/`-separated */
  path: string
  kind: 'created' | 'modified' | 'deleted'
}

interface ChangeRecord {
  original: string | null
  written: string | null
}

const MAX_READ_CHARS = 200_000
const MAX_FILE_BYTES = 2_000_000
const MAX_LIST = 2_000
const MAX_HITS = 100
// Snapshot limits for the CLIs, whose writes Merkzeug cannot intercept
const MAX_SNAPSHOT_BYTES = 64_000_000
const MAX_SNAPSHOT_FILES = 20_000

const toSlash = (path: string): string => path.split(sep).join('/')

function inside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export class VaultSession {
  readonly root: string
  readonly access: VaultAccess
  private readonly realRoot: string
  private readonly ignoreDir: (path: string) => boolean
  private readonly changes = new Map<string, ChangeRecord>()
  private snapshot: Map<string, string> | null = null
  private snapshotComplete = false
  /** false when a CLI ran on a vault too large to snapshot completely */
  undoComplete = true

  constructor(root: string, access: VaultAccess, ignoreDir: (path: string) => boolean = () => false) {
    this.root = resolve(root)
    this.realRoot = realpathSync(this.root)
    this.access = access
    this.ignoreDir = ignoreDir
  }

  /** Absolute path for a model-supplied relative path, or an error text. */
  resolvePath(input: string, kind: 'file' | 'folder'): { path: string } | { error: string } {
    const cleaned = input.trim().replace(/\\/g, '/').replace(/^\.?\/+/, '')
    if (kind === 'file' && !cleaned) return { error: 'A file path is required.' }
    if (/^[a-z]:\//i.test(cleaned) || input.trim().startsWith('~')) return { error: 'Use a path relative to the vault root.' }
    const absolute = resolve(this.root, cleaned)
    if (!inside(this.root, absolute)) return { error: 'The path is outside the vault.' }
    const segments = toSlash(relative(this.root, absolute)).split('/').filter(Boolean)
    if (segments.some((segment) => segment.startsWith('.'))) return { error: 'Hidden files and folders are not accessible.' }
    // Symbolic links: the nearest existing ancestor must resolve inside the vault
    let existing = absolute
    while (!existsSync(existing) && existing !== this.root) existing = dirname(existing)
    let real: string
    try {
      real = realpathSync(existing)
    } catch {
      return { error: 'The path cannot be resolved.' }
    }
    if (!inside(this.realRoot, real)) return { error: 'The path leads outside the vault.' }
    for (let dir = kind === 'file' ? dirname(absolute) : absolute; inside(this.root, dir) && dir !== this.root; dir = dirname(dir)) {
      if (this.ignoreDir(dir)) return { error: 'This folder is excluded from the vault.' }
    }
    if (kind === 'file' && !isTextPath(absolute)) return { error: 'Only text files (Markdown, txt, csv, json, yaml, mmd) are accessible.' }
    return { path: absolute }
  }

  relativePath(path: string): string {
    return toSlash(relative(this.root, path))
  }

  /** Text files below `dir`, relative to the vault root, sorted. */
  private walk(dir: string, limit: number): { files: string[]; truncated: boolean } {
    const files: string[] = []
    let truncated = false
    const visit = (current: string): void => {
      let entries
      try {
        entries = readdirSync(current, { withFileTypes: true })
      } catch {
        return
      }
      entries.sort((a, b) => a.name.localeCompare(b.name))
      for (const entry of entries) {
        if (truncated) return
        if (entry.name.startsWith('.')) continue
        const full = join(current, entry.name)
        // links are not followed: targets inside the vault are reached directly, others are off limits
        if (entry.isSymbolicLink()) continue
        const isDir = entry.isDirectory()
        const isFile = entry.isFile()
        if (isDir) {
          if (!this.ignoreDir(full)) visit(full)
        } else if (isFile && isTextPath(entry.name)) {
          if (files.length >= limit) {
            truncated = true
            return
          }
          files.push(full)
        }
      }
    }
    visit(dir)
    return { files, truncated }
  }

  private readText(path: string): string {
    const size = statSync(path).size
    if (size > MAX_FILE_BYTES) throw new Error(`The file is too large (${Math.round(size / 1000)} kB).`)
    return readFileSync(path, 'utf8')
  }

  async run(call: VaultToolCall, onActivity: (activity: VaultActivity) => void): Promise<ToolOutcome> {
    const fail = (content: string, path = ''): ToolOutcome => {
      onActivity({ kind: 'denied', path, detail: content })
      return { content, isError: true }
    }
    switch (call.name) {
      case 'list_files': {
        const target = this.resolvePath(call.folder, 'folder')
        if ('error' in target) return fail(target.error, call.folder)
        if (!existsSync(target.path) || !statSync(target.path).isDirectory()) return fail('The folder does not exist.', call.folder)
        onActivity({ kind: 'list', path: this.relativePath(target.path) || '/' })
        const { files, truncated } = this.walk(target.path, MAX_LIST)
        const list = files.map((file) => this.relativePath(file))
        if (list.length === 0) return { content: 'No text files in this folder.', isError: false }
        return { content: list.join('\n') + (truncated ? `\n[… list truncated after ${MAX_LIST} files …]` : ''), isError: false }
      }
      case 'search_vault': {
        const target = this.resolvePath(call.folder, 'folder')
        if ('error' in target) return fail(target.error, call.folder)
        onActivity({ kind: 'search', path: this.relativePath(target.path) || '/', detail: call.query })
        const needle = call.query.toLowerCase()
        const hits: string[] = []
        for (const file of this.walk(target.path, Number.MAX_SAFE_INTEGER).files) {
          let text: string
          try {
            text = this.readText(file)
          } catch {
            continue
          }
          if (!text.toLowerCase().includes(needle)) continue
          const lines = text.split('\n')
          for (let i = 0; i < lines.length && hits.length < MAX_HITS; i++) {
            if (lines[i].toLowerCase().includes(needle)) hits.push(`${this.relativePath(file)}:${i + 1}: ${lines[i].trim().slice(0, 300)}`)
          }
          if (hits.length >= MAX_HITS) break
        }
        if (hits.length === 0) return { content: 'No matches.', isError: false }
        return { content: hits.join('\n') + (hits.length >= MAX_HITS ? `\n[… more than ${MAX_HITS} matches …]` : ''), isError: false }
      }
      case 'read_file': {
        const target = this.resolvePath(call.path, 'file')
        if ('error' in target) return fail(target.error, call.path)
        if (!existsSync(target.path)) return fail('The file does not exist.', call.path)
        let text: string
        try {
          text = this.readText(target.path)
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err), call.path)
        }
        onActivity({ kind: 'read', path: this.relativePath(target.path) })
        if (text.length > MAX_READ_CHARS) {
          text = `${text.slice(0, MAX_READ_CHARS)}\n[… ${text.length - MAX_READ_CHARS} more characters not shown …]`
        }
        return { content: text, isError: false }
      }
      case 'write_file':
      case 'edit_file': {
        if (this.access !== 'write') return fail('Editing vault files is not allowed. Use request_write_access.', call.path)
        const target = this.resolvePath(call.path, 'file')
        if ('error' in target) return fail(target.error, call.path)
        const exists = existsSync(target.path)
        let original: string | null = null
        try {
          original = exists ? this.readText(target.path) : null
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err), call.path)
        }
        let next: string
        if (call.name === 'write_file') {
          next = call.content
        } else {
          if (original === null) return fail('The file does not exist; use write_file to create it.', call.path)
          const count = original.split(call.oldText).length - 1
          if (count === 0) return fail('old_text was not found in the file. Read the file again and copy the passage exactly.', call.path)
          if (count > 1 && !call.replaceAll) return fail(`old_text occurs ${count} times; add surrounding text to make it unique or set replace_all.`, call.path)
          next = call.replaceAll ? original.split(call.oldText).join(call.newText) : original.replace(call.oldText, () => call.newText)
        }
        if (Buffer.byteLength(next) > MAX_FILE_BYTES) return fail('The new content is too large.', call.path)
        if (next === original) return { content: 'The file already has this content; nothing changed.', isError: false }
        this.remember(target.path, original)
        mkdirSync(dirname(target.path), { recursive: true })
        writeFileSync(target.path, next, 'utf8')
        this.changes.get(target.path)!.written = next
        onActivity({ kind: 'write', path: this.relativePath(target.path), detail: exists ? 'modified' : 'created' })
        return { content: exists ? 'File updated.' : 'File created.', isError: false }
      }
      case 'request_write_access': {
        onActivity({ kind: 'needsWrite', path: '', detail: call.reason })
        return {
          content: 'The user has been asked to allow editing. Stop now and tell the user in one or two sentences what you would change once editing is allowed.',
          isError: false
        }
      }
    }
  }

  /** Original content before the first change in this answer. */
  private remember(path: string, original: string | null): void {
    if (!this.changes.has(path)) this.changes.set(path, { original, written: null })
  }

  /** Records all text files before a CLI run in write mode; false if the vault is too large for undo. */
  takeSnapshot(): boolean {
    const { files, truncated } = this.walk(this.root, MAX_SNAPSHOT_FILES)
    const snapshot = new Map<string, string>()
    let bytes = 0
    let complete = !truncated
    for (const file of files) {
      try {
        const size = statSync(file).size
        if (size > MAX_FILE_BYTES || bytes + size > MAX_SNAPSHOT_BYTES) {
          complete = false
          continue
        }
        snapshot.set(file, readFileSync(file, 'utf8'))
        bytes += size
      } catch {
        complete = false
      }
    }
    this.snapshot = snapshot
    this.snapshotComplete = complete
    this.undoComplete = complete
    return complete
  }

  /** Compares the vault with the snapshot and records what a CLI changed. */
  collectSnapshotChanges(): void {
    if (!this.snapshot) return
    const after = new Set(this.walk(this.root, MAX_SNAPSHOT_FILES).files)
    for (const [file, original] of this.snapshot) {
      if (!after.has(file)) {
        if (!existsSync(file)) this.changes.set(file, { original, written: null })
        continue
      }
      let current: string
      try {
        current = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      if (current !== original) this.changes.set(file, { original, written: current })
    }
    if (this.snapshotComplete) {
      for (const file of after) {
        if (this.snapshot.has(file)) continue
        try {
          this.changes.set(file, { original: null, written: readFileSync(file, 'utf8') })
        } catch {
          /* vanished again */
        }
      }
    }
    this.snapshot = null
  }

  changeList(): FileChange[] {
    return [...this.changes.entries()]
      .map(([path, record]) => ({
        path: this.relativePath(path),
        kind: record.original === null ? ('created' as const) : record.written === null ? ('deleted' as const) : ('modified' as const)
      }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }

  /**
   * Restores the original contents. Files changed again since the answer
   * (by the user or another program) are left alone and reported.
   */
  undo(): { restored: string[]; skipped: string[] } {
    const restored: string[] = []
    const skipped: string[] = []
    for (const [path, record] of this.changes) {
      const rel = this.relativePath(path)
      const current = existsSync(path) ? readFileSync(path, 'utf8') : null
      if (current !== record.written) {
        skipped.push(rel)
        continue
      }
      if (record.original === null) {
        if (lstatSync(path).isFile()) unlinkSync(path)
      } else {
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, record.original, 'utf8')
      }
      restored.push(rel)
    }
    this.changes.clear()
    return { restored, skipped }
  }
}

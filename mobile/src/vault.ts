import { planLinkEdits, movedLinkPath, type LinkEdit } from '@merkzeug/core/linkRefactoring'
import type { GuidanceHost } from '@merkzeug/editor/VaultGuidance'
import type { InstructionName } from '@merkzeug/core/vaultGuidance'
import { t as translate } from '@merkzeug/core/i18n'
import { Capacitor, registerPlugin } from '@capacitor/core'

/** Dateibaum, Pfade sind Vault-relativ und beginnen mit "/" (Wurzel = "/"). */
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
}

export interface VaultInfo {
  id?: string
  initialPath?: string
  name: string
}

export interface FileStat {
  exists: boolean
  isDirectory: boolean
  /** Millisekunden seit Epoche; fehlt, wenn die Datei nicht existiert. */
  mtime?: number
}

export interface SearchResult {
  path: string
  /** Erste Trefferzeile (leer bei reinem Dateinamen-Treffer). */
  snippet: string
}

/** Speichern schlug fehl, weil die Datei extern geändert wurde (Stale-Check). */
export function isConflictError(err: unknown): boolean {
  return (
    (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'CONFLICT') ||
    String(err).includes('CONFLICT')
  )
}

/**
 * Zugriff auf den Vault-Ordner. Auf iOS steckt dahinter das native
 * Capacitor-Plugin (Dokument-Picker + security-scoped Bookmark), im
 * Browser-Dev-Modus ein In-Memory-Mock.
 */
export interface VaultBackend {
  /** Zuletzt gewählten Vault wiederherstellen (Bookmark), sonst null. */
  restoreVault(): Promise<VaultInfo | null>
  /** Ordner-Picker anzeigen; null, wenn abgebrochen. */
  pickVault(): Promise<VaultInfo | null>
  readTree(): Promise<FileNode>
  readFile(path: string): Promise<{ content: string; mtime: number }>
  /**
   * Schreiben mit Stale-Check: Ist `expectedMtime` gesetzt und die Datei auf
   * der Platte neuer, wird mit einem CONFLICT-Fehler abgelehnt (siehe
   * `isConflictError`). Liefert die neue mtime.
   */
  writeFile(path: string, content: string, expectedMtime?: number): Promise<number>
  /** Binärdatei (z. B. Bild) als Base64 lesen. */
  readFileBase64(path: string): Promise<string>
  /** Bild neben der Notiz ablegen; liefert den notiz-relativen Pfad. */
  saveImage(notePath: string, base64: string, ext: string): Promise<string>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<FileStat>
  createFolder(path: string): Promise<void>
  deleteItem(path: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  /** Case-insensitive Suche in Dateinamen und Inhalten aller .md-Dateien. */
  search(query: string): Promise<SearchResult[]>
}

interface VaultPlugin {
  guidanceRead(options: { name: InstructionName }): Promise<{ content?: string }>
  guidanceAppend(options: { name: InstructionName; expected: string | null; addition: string }): Promise<void>
  restoreVault(): Promise<{ name: string | null; id?: string; initialPath?: string }>
  pickVault(): Promise<{ name: string | null; id?: string }>
  readTree(): Promise<{ tree: FileNode }>
  readFile(options: { path: string }): Promise<{ content: string; mtime: number }>
  writeFile(options: {
    path: string
    content: string
    expectedMtime?: number
  }): Promise<{ mtime: number }>
  readFileBase64(options: { path: string }): Promise<{ data: string }>
  saveImage(options: {
    notePath: string
    base64: string
    ext: string
  }): Promise<{ relPath: string }>
  exists(options: { path: string }): Promise<{ exists: boolean }>
  stat(options: { path: string }): Promise<FileStat>
  createFolder(options: { path: string }): Promise<void>
  deleteItem(options: { path: string }): Promise<void>
  rename(options: { from: string; to: string; edits: LinkEdit[] }): Promise<void>
  search(options: { query: string }): Promise<{ results: SearchResult[] }>
}

const Vault = registerPlugin<VaultPlugin>('Vault')

const nativeBackend: VaultBackend = {
  async restoreVault() {
    const { name, id, initialPath } = await Vault.restoreVault()
    return name ? { name, id, initialPath } : null
  },
  async pickVault() {
    const { name, id } = await Vault.pickVault()
    return name ? { name, id } : null
  },
  async readTree() {
    return (await Vault.readTree()).tree
  },
  async readFile(path) {
    return Vault.readFile({ path })
  },
  async writeFile(path, content, expectedMtime) {
    return (await Vault.writeFile({ path, content, expectedMtime })).mtime
  },
  async readFileBase64(path) {
    return (await Vault.readFileBase64({ path })).data
  },
  async saveImage(notePath, base64, ext) {
    return (await Vault.saveImage({ notePath, base64, ext })).relPath
  },
  async exists(path) {
    return (await Vault.exists({ path })).exists
  },
  async stat(path) {
    return Vault.stat({ path })
  },
  async createFolder(path) {
    await Vault.createFolder({ path })
  },
  async deleteItem(path) {
    await Vault.deleteItem({ path })
  },
  async rename(from, to) {
    const tree = (await Vault.readTree()).tree
    const paths: string[] = []
    const visit = (node: FileNode) => { if (node.isDirectory) node.children?.forEach(visit); else if (/\.md$/i.test(node.path)) paths.push(node.path) }
    visit(tree)
    const files = []
    for (const path of paths) files.push({ path, content: (await Vault.readFile({ path })).content })
    const moves = [{ from, to }]
    if (!(await Vault.stat({ path: from })).isDirectory && /\.md$/i.test(from) && (await Vault.exists({ path: from.slice(0, -3) + '.assets' })).exists) moves.push({ from: from.slice(0, -3) + '.assets', to: to.slice(0, -3) + '.assets' })
    await Vault.rename({ from, to, edits: planLinkEdits(files, moves) })
    window.dispatchEvent(new Event('merkzeug-external-change'))
  },
  async search(query) {
    return (await Vault.search({ query })).results
  }
}

/* ---- Browser-Mock für `npm run dev` (Safari/Chrome am Mac) ---- */

const demoFiles = new Map<string, string>([
  [
    '/Willkommen.md',
    '# Willkommen\n\nDies ist der **Demo-Vault** des Browser-Dev-Modus.\n\n' +
      '- [Ideen](Projekte/Ideen.md)\n- [Diagramm-Test](Diagramm.md)\n'
  ],
  [
    '/Projekte/Ideen.md',
    '# Ideen\n\nZurück zu [Willkommen](/Willkommen.md).\n\n- iOS-Spike bauen\n- Kaffee trinken\n'
  ],
  [
    '/Diagramm.md',
    '# Diagramm\n\n```mermaid\ngraph TD\n  A[Working Copy] -->|File Provider| B[Merkzeug]\n  B -->|speichert| A\n```\n'
  ]
])

function mockTree(): FileNode {
  const root: FileNode = { name: 'Demo-Vault', path: '/', isDirectory: true, children: [] }
  for (const path of [...demoFiles.keys()].sort()) {
    const parts = path.split('/').filter(Boolean)
    let dir = root
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = '/' + parts.slice(0, i + 1).join('/')
      let next = dir.children!.find((c) => c.path === dirPath)
      if (!next) {
        next = { name: parts[i], path: dirPath, isDirectory: true, children: [] }
        dir.children!.push(next)
      }
      dir = next
    }
    dir.children!.push({ name: parts[parts.length - 1], path, isDirectory: false })
  }
  return root
}

const demoMtimes = new Map<string, number>()
const demoFolders = new Set<string>()
const mockMtime = (path: string): number => demoMtimes.get(path) ?? 0
const mockIsFolder = (path: string): boolean =>
  demoFolders.has(path) || [...demoFiles.keys()].some((k) => k.startsWith(`${path}/`))

const mockBackend: VaultBackend = {
  restoreVault: () => Promise.resolve({ name: 'Demo-Vault' }),
  pickVault: () => Promise.resolve({ name: 'Demo-Vault' }),
  readTree: () => {
    const root = mockTree()
    for (const folder of demoFolders) {
      const parts = folder.split('/').filter(Boolean)
      let dir = root
      for (let i = 0; i < parts.length; i++) {
        const dirPath = '/' + parts.slice(0, i + 1).join('/')
        let next = dir.children!.find((c) => c.path === dirPath)
        if (!next) {
          next = { name: parts[i], path: dirPath, isDirectory: true, children: [] }
          dir.children!.push(next)
        }
        dir = next
      }
    }
    return Promise.resolve(root)
  },
  readFile: (path) => {
    const content = demoFiles.get(path)
    return content !== undefined
      ? Promise.resolve({ content, mtime: mockMtime(path) })
      : Promise.reject(new Error(`${translate("File not found:")} ${path}`))
  },
  writeFile: (path, content, expectedMtime) => {
    if (expectedMtime !== undefined && mockMtime(path) > expectedMtime + 1) {
      return Promise.reject(new Error(translate("CONFLICT: The file was changed externally.")))
    }
    demoFiles.set(path, content)
    const mtime = Date.now()
    demoMtimes.set(path, mtime)
    return Promise.resolve(mtime)
  },
  readFileBase64: () => Promise.reject(new Error(translate("Not available in development mode"))),
  saveImage: () => Promise.reject(new Error(translate("Not available in development mode"))),
  exists: (path) => Promise.resolve(demoFiles.has(path) || mockIsFolder(path)),
  stat: (path) => {
    if (demoFiles.has(path)) {
      return Promise.resolve({ exists: true, isDirectory: false, mtime: mockMtime(path) })
    }
    return Promise.resolve({ exists: mockIsFolder(path), isDirectory: mockIsFolder(path) })
  },
  createFolder: (path) => {
    demoFolders.add(path)
    return Promise.resolve()
  },
  deleteItem: (path) => {
    demoFiles.delete(path)
    demoFolders.delete(path)
    for (const key of [...demoFiles.keys()]) {
      if (key.startsWith(`${path}/`)) demoFiles.delete(key)
    }
    return Promise.resolve()
  },
  rename: (from, to) => {
    if (demoFiles.has(to) || demoFolders.has(to)) return Promise.reject(new Error('Destination exists'))
    const moves = [{ from, to }]
    const edits = planLinkEdits([...demoFiles].map(([path, content]) => ({ path, content })), moves)
    const after = new Map(edits.map(edit => [edit.path, edit.after]))
    const files = [...demoFiles]; demoFiles.clear()
    for (const [path, content] of files) demoFiles.set(movedLinkPath(path, moves), after.get(path) ?? content)
    const folders = [...demoFolders]; demoFolders.clear()
    for (const path of folders) demoFolders.add(movedLinkPath(path, moves))
    window.dispatchEvent(new Event('merkzeug-external-change'))
    return Promise.resolve()
  },
  search: (query) => {
    const q = query.toLowerCase()
    const results: SearchResult[] = []
    for (const [path, content] of demoFiles) {
      const nameMatch = path.split('/').pop()!.toLowerCase().includes(q)
      const line = content.split('\n').find((l) => l.toLowerCase().includes(q))
      if (nameMatch || line) results.push({ path, snippet: line?.trim().slice(0, 160) ?? '' })
    }
    return Promise.resolve(results)
  }
}

export const vault: VaultBackend = Capacitor.isNativePlatform() ? nativeBackend : mockBackend

export const guidanceHost: GuidanceHost = {
  read: async name => Capacitor.isNativePlatform() ? (await Vault.guidanceRead({ name })).content ?? null : demoFiles.get(`/${name}`) ?? null,
  append: async (name, expected, addition) => {
    if (Capacitor.isNativePlatform()) return Vault.guidanceAppend({ name, expected, addition })
    if ((demoFiles.get(`/${name}`) ?? null) !== expected) throw new Error('Instructions changed externally.')
    demoFiles.set(`/${name}`, (expected ?? '') + addition)
  }
}

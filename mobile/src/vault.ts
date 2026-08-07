import { Capacitor, registerPlugin } from '@capacitor/core'

/** Dateibaum, Pfade sind Vault-relativ und beginnen mit "/" (Wurzel = "/"). */
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
}

export interface VaultInfo {
  name: string
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
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  /** Binärdatei (z. B. Bild) als Base64 lesen. */
  readFileBase64(path: string): Promise<string>
  /** Bild neben der Notiz ablegen; liefert den notiz-relativen Pfad. */
  saveImage(notePath: string, base64: string, ext: string): Promise<string>
  exists(path: string): Promise<boolean>
}

interface VaultPlugin {
  restoreVault(): Promise<{ name: string | null }>
  pickVault(): Promise<{ name: string | null }>
  readTree(): Promise<{ tree: FileNode }>
  readFile(options: { path: string }): Promise<{ content: string }>
  writeFile(options: { path: string; content: string }): Promise<void>
  readFileBase64(options: { path: string }): Promise<{ data: string }>
  saveImage(options: {
    notePath: string
    base64: string
    ext: string
  }): Promise<{ relPath: string }>
  exists(options: { path: string }): Promise<{ exists: boolean }>
}

const Vault = registerPlugin<VaultPlugin>('Vault')

const nativeBackend: VaultBackend = {
  async restoreVault() {
    const { name } = await Vault.restoreVault()
    return name ? { name } : null
  },
  async pickVault() {
    const { name } = await Vault.pickVault()
    return name ? { name } : null
  },
  async readTree() {
    return (await Vault.readTree()).tree
  },
  async readFile(path) {
    return (await Vault.readFile({ path })).content
  },
  async writeFile(path, content) {
    await Vault.writeFile({ path, content })
  },
  async readFileBase64(path) {
    return (await Vault.readFileBase64({ path })).data
  },
  async saveImage(notePath, base64, ext) {
    return (await Vault.saveImage({ notePath, base64, ext })).relPath
  },
  async exists(path) {
    return (await Vault.exists({ path })).exists
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

const mockBackend: VaultBackend = {
  restoreVault: () => Promise.resolve({ name: 'Demo-Vault' }),
  pickVault: () => Promise.resolve({ name: 'Demo-Vault' }),
  readTree: () => Promise.resolve(mockTree()),
  readFile: (path) => {
    const content = demoFiles.get(path)
    return content !== undefined
      ? Promise.resolve(content)
      : Promise.reject(new Error(`Datei nicht gefunden: ${path}`))
  },
  writeFile: (path, content) => {
    demoFiles.set(path, content)
    return Promise.resolve()
  },
  readFileBase64: () => Promise.reject(new Error('Im Dev-Modus nicht verfügbar')),
  saveImage: () => Promise.reject(new Error('Im Dev-Modus nicht verfügbar')),
  exists: (path) =>
    Promise.resolve(demoFiles.has(path) || [...demoFiles.keys()].some((k) => k.startsWith(`${path}/`)))
}

export const vault: VaultBackend = Capacitor.isNativePlatform() ? nativeBackend : mockBackend

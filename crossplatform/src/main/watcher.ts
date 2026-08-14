import { watch as watchFs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import chokidar from 'chokidar'
import type { BrowserWindow } from 'electron'
import { isIgnoredDir } from './ignore'

const watchers = new Map<number, () => void>()

/** Beobachtet den Vault eines Fensters; Änderungen werden gebündelt gemeldet. */
export function watchVault(win: BrowserWindow, vault: string): void {
  stopWatching(win.id)
  let timer: NodeJS.Timeout | null = null
  const pending = new Set<string>()
  const report = (path: string): void => {
    pending.add(path)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const paths = [...pending]
      pending.clear()
      if (!win.isDestroyed()) win.webContents.send('vault:changed', { vault, paths })
    }, 300)
  }
  // Punkt-Ordner (.git …) sowie Abhängigkeits-/Build-Ordner nicht melden
  const ignored = (path: string): boolean => {
    for (let p = path; p !== vault; ) {
      if (basename(p).startsWith('.') || isIgnoredDir(p)) return true
      const parent = dirname(p)
      if (parent === p) break
      p = parent
    }
    return false
  }

  try {
    // Ein einziger rekursiver Watcher (macOS: FSEvents, Windows:
    // ReadDirectoryChangesW) kommt mit einem Deskriptor aus. Ein Watcher je
    // Datei/Verzeichnis erschöpft bei großen Vaults das Deskriptor-Limit des
    // Main-Prozesses — danach scheitern spawn(), printToPDF() usw. mit EBADF.
    const watcher = watchFs(vault, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const abs = join(vault, filename.toString())
      if (!ignored(abs)) report(abs)
    })
    watcher.on('error', () => {
      /* z. B. Vault-Ordner entfernt: Watcher stillschweigend aufgeben */
    })
    watchers.set(win.id, () => watcher.close())
  } catch {
    // Fallback für Plattformen ohne rekursives fs.watch (ältere Linux-Kernel)
    const watcher = chokidar.watch(vault, {
      ignored: (path) => path !== vault && ignored(path),
      ignoreInitial: true,
      persistent: true
    })
    watcher.on('all', (_event, path) => {
      if (path) report(path)
    })
    watchers.set(win.id, () => void watcher.close())
  }
  win.once('closed', () => stopWatching(win.id))
}

export function stopWatching(winId: number): void {
  const close = watchers.get(winId)
  if (close) {
    close()
    watchers.delete(winId)
  }
}

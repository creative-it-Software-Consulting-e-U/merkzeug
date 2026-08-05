import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'

const watchers = new Map<number, FSWatcher>()

/** Beobachtet den Vault eines Fensters; Änderungen werden gebündelt gemeldet. */
export function watchVault(win: BrowserWindow, vault: string): void {
  stopWatching(win.id)
  let timer: NodeJS.Timeout | null = null
  const watcher = chokidar.watch(vault, {
    ignored: (path) => path.includes('/.git') || /(^|\/)\.[^/]+$/.test(path),
    ignoreInitial: true,
    persistent: true
  })
  watcher.on('all', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send('vault:changed', { vault })
    }, 300)
  })
  watchers.set(win.id, watcher)
  win.once('closed', () => stopWatching(win.id))
}

export function stopWatching(winId: number): void {
  const existing = watchers.get(winId)
  if (existing) {
    existing.close()
    watchers.delete(winId)
  }
}

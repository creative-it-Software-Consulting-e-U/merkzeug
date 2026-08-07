import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import { isIgnoredDir } from './ignore'

const watchers = new Map<number, FSWatcher>()

/** Beobachtet den Vault eines Fensters; Änderungen werden gebündelt gemeldet. */
export function watchVault(win: BrowserWindow, vault: string): void {
  stopWatching(win.id)
  let timer: NodeJS.Timeout | null = null
  const pending = new Set<string>()
  const watcher = chokidar.watch(vault, {
    ignored: (path) =>
      path !== vault &&
      (path.includes('/.git') || /(^|\/)\.[^/]+$/.test(path) || isIgnoredDir(path)),
    ignoreInitial: true,
    persistent: true
  })
  watcher.on('all', (_event, path) => {
    if (path) pending.add(path)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const paths = [...pending]
      pending.clear()
      if (!win.isDestroyed()) win.webContents.send('vault:changed', { vault, paths })
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

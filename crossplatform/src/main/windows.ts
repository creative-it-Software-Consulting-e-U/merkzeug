import { t as translate } from '@merkzeug/core/i18n'
import { app, BrowserWindow, shell, nativeTheme, screen } from 'electron'
import { saveWindows, type SavedWindow } from './settings'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

/** Vault-Zuordnung pro Fenster */
const windowVaults = new Map<number, string | null>()

export function getWindowVault(winId: number): string | null {
  return windowVaults.get(winId) ?? null
}

let quitting = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
function saveWindowSession(): void {
  if (quitting || process.env.MERKZEUG_VAULT || process.env.MERKZEUG_SCREENSHOT) return
  saveWindows([...windowVaults].flatMap(([id, vault]) => {
    const win = BrowserWindow.fromId(id)
    return !win || win.isDestroyed() ? [] : [{ vault, bounds: win.getNormalBounds(), maximized: win.isMaximized(), fullScreen: win.isFullScreen() }]
  }))
}
function scheduleSessionSave(): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveWindowSession, 200)
}
app.on('before-quit', () => {
  clearTimeout(saveTimer)
  saveWindowSession()
  quitting = true // Closing windows during Quit must not erase the saved session.
})

export function setWindowVault(winId: number, vault: string | null): void {
  windowVaults.set(winId, vault)
  scheduleSessionSave()
}

export function createMainWindow(vault: string | null, saved?: SavedWindow): BrowserWindow {
  // Rehome windows from disconnected displays, keeping them reachable.
  const area = saved ? screen.getDisplayMatching(saved.bounds).workArea : undefined
  const bounds = saved && area ? {
    width: Math.min(saved.bounds.width, area.width), height: Math.min(saved.bounds.height, area.height),
    x: Math.max(area.x, Math.min(saved.bounds.x, area.x + area.width - Math.min(saved.bounds.width, area.width))),
    y: Math.max(area.y, Math.min(saved.bounds.y, area.y + area.height - Math.min(saved.bounds.height, area.height)))
  } : {}
  const win = new BrowserWindow({
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    enableLargerThanScreen: Boolean(process.env.MERKZEUG_SCREENSHOT && process.env.MERKZEUG_SCREENSHOT_PROFILE),
    width: 1280,
    height: 850,
    ...bounds,
    minWidth: 720,
    minHeight: 480,
    title: 'Merkzeug',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.once('ready-to-show', () => {
    if (saved?.maximized) win.maximize()
    win.show()
    if (saved?.fullScreen) win.setFullScreen(true)
  })
  windowVaults.set(win.id, vault)
  win.once('closed', () => { windowVaults.delete(win.id); scheduleSessionSave() })
  win.on('move', scheduleSessionSave)
  win.on('resize', scheduleSessionSave)
  win.on('maximize', scheduleSessionSave)
  win.on('unmaximize', scheduleSessionSave)
  win.on('enter-full-screen', scheduleSessionSave)
  win.on('leave-full-screen', scheduleSessionSave)
  scheduleSessionSave()

  // Zurück-/Vorwärts-Maustasten und Touchpad-Gesten unter Windows
  win.on('app-command', (_e, cmd) => {
    if (cmd === 'browser-backward') win.webContents.send('menu:action', { action: 'navBack' })
    else if (cmd === 'browser-forward') win.webContents.send('menu:action', { action: 'navForward' })
  })
  // Drei-Finger-Wischen unter macOS (Systemeinstellung „Zwischen Seiten blättern")
  win.on('swipe', (_e, direction) => {
    if (direction === 'left') win.webContents.send('menu:action', { action: 'navBack' })
    else if (direction === 'right') win.webContents.send('menu:action', { action: 'navForward' })
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

let helpWindow: BrowserWindow | null = null

export function openHelpWindow(): void {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.focus()
    return
  }
  helpWindow = new BrowserWindow({
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    width: 760,
    height: 820,
    title: translate("Merkzeug Help"),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  helpWindow.once('ready-to-show', () => helpWindow?.show())
  helpWindow.once('closed', () => {
    helpWindow = null
  })
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    helpWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#help`)
  } else {
    helpWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'help' })
  }
}

let settingsWindow: BrowserWindow | null = null
/** Vault des Fensters, aus dem die Einstellungen zuletzt geöffnet wurden */
let settingsVault: string | null = null

export function getSettingsVault(): string | null {
  return settingsVault
}

export function openSettingsWindow(vault: string | null): void {
  settingsVault = vault
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    // ggf. neuer Vault-Kontext: Renderer lädt den Zustand neu
    settingsWindow.webContents.send('settings:refresh')
    return
  }
  settingsWindow = new BrowserWindow({
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    enableLargerThanScreen: Boolean(process.env.MERKZEUG_SCREENSHOT && process.env.MERKZEUG_SCREENSHOT_PROFILE),
    width: 560,
    height: 660,
    minWidth: 460,
    minHeight: 400,
    title: translate("Settings"),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  settingsWindow.once('closed', () => {
    settingsWindow = null
  })
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#settings`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'settings' })
  }
}

export function openMermaidZoom(svg: string): void {
  const zoom = new BrowserWindow({
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    width: 900,
    height: 700,
    title: translate("Diagram"),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  const payload = encodeURIComponent(svg)
  zoom.once('ready-to-show', () => zoom.show())
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    zoom.loadURL(`${process.env.ELECTRON_RENDERER_URL}#zoom`)
  } else {
    zoom.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'zoom' })
  }
  zoom.webContents.once('did-finish-load', () => {
    zoom.setTitle(translate("Diagram"))
    zoom.webContents.send('zoom:svg', payload)
  })
}

import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

/** Vault-Zuordnung pro Fenster */
const windowVaults = new Map<number, string | null>()

export function getWindowVault(winId: number): string | null {
  return windowVaults.get(winId) ?? null
}

export function setWindowVault(winId: number, vault: string | null): void {
  windowVaults.set(winId, vault)
}

export function createMainWindow(vault: string | null): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 720,
    minHeight: 480,
    title: 'MyNotion',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  windowVaults.set(win.id, vault)
  win.once('closed', () => windowVaults.delete(win.id))

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
    width: 760,
    height: 820,
    title: 'MyNotion-Hilfe',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  helpWindow.once('closed', () => {
    helpWindow = null
  })
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    helpWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#help`)
  } else {
    helpWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'help' })
  }
}

export function openMermaidZoom(svg: string): void {
  const zoom = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Diagramm',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  const payload = encodeURIComponent(svg)
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    zoom.loadURL(`${process.env.ELECTRON_RENDERER_URL}#zoom`)
  } else {
    zoom.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'zoom' })
  }
  zoom.webContents.once('did-finish-load', () => {
    zoom.setTitle('Diagramm')
    zoom.webContents.send('zoom:svg', payload)
  })
}

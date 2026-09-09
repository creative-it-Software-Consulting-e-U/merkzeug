import { rememberFolderAccess, restoreFolderAccess } from './sandboxAccess'
import { FileRevisions } from './fileRevisions'
import { vaultFilePath } from '@merkzeug/core/vaultFileUrl'
import { t as translate, setLocale, getLocale } from '@merkzeug/core/i18n'
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, protocol, shell } from 'electron'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import type { TemplateState, CalendarEvent } from '../shared/types'
import {
  createFolder,
  autoRenameNote,
  createNote,
  createNoteFrom,
  movePath,
  readTree,
  renamePath,
  saveImage,
  trashPath
} from './vaultOps'
import { gitCommitPush, gitPull, gitPush, gitStatus } from './git'
import {
  addRecentVault,
  getLastVault,
  getRecentVaults,
  setStoredTemplatesRoot
} from './settings'
import {
  createTemplate,
  getVaultTemplateName,
  listTemplates,
  setVaultTemplateName,
  templatesRoot
} from './templates'
import { buildMenu } from './menu'
import {
  createMainWindow,
  getSettingsVault,
  getWindowVault,
  openHelpWindow,
  openMermaidZoom,
  openSettingsWindow,
  setWindowVault
} from './windows'
import { watchVault } from './watcher'
import { registerPdfIpc } from './pdfExport'
import { calendarEventDetail, listCalendarEvents } from './calendar'

protocol.registerSchemesAsPrivileged([
  { scheme: 'vault-file', privileges: { stream: true, supportFetchAPI: true, bypassCSP: true } }
])

// Sicherheitsnetz für sehr große Vaults: sind alle Datei-Deskriptoren belegt,
// scheitern spawn() (Git) und printToPDF() im Main-Prozess mit EBADF.
try {
  process.setFdLimit(8192)
} catch {
  /* unter Windows nicht verfügbar */
}

function winFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

async function pickVault(win?: BrowserWindow): Promise<string | null> {
  const options: Electron.OpenDialogOptions = {
    title: translate("Choose vault folder"),
    securityScopedBookmarks: !!process.mas,
    properties: ['openDirectory', 'createDirectory']
  }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null
  rememberFolderAccess(result.filePaths[0], result.bookmarks?.[0])
  return result.filePaths[0]
}

function assignVault(win: BrowserWindow, vault: string): void {
  setWindowVault(win.id, vault)
  addRecentVault(vault)
  watchVault(win, vault)
  rebuildMenu()
  win.webContents.send('vault:set', { vault })
}

async function openVaultViaDialog(win?: BrowserWindow): Promise<void> {
  const vault = await pickVault(win)
  if (!vault) return
  if (win) assignVault(win, vault)
  else assignVault(createMainWindow(vault), vault)
}

function newWindow(): void {
  const focused = BrowserWindow.getFocusedWindow()
  const vault = focused ? getWindowVault(focused.id) : getLastVault() ?? null
  createMainWindow(vault)
}

function rebuildMenu(): void {
  buildMenu({
    newWindow,
    openVault: (win) => void openVaultViaDialog(win),
    openRecent: (win, path) => {
      if (!existsSync(path)) {
        dialog.showErrorBox(translate("Vault not found"), `${translate("The folder no longer exists:\\n")}${path}`)
        return
      }
      if (win) assignVault(win, path)
      else assignVault(createMainWindow(path), path)
    },
    openHelp: openHelpWindow,
    openSettings: (win) =>
      openSettingsWindow(win ? getWindowVault(win.id) : getLastVault() ?? null)
  })
}

/** Zustand für das Einstellungs-Fenster (nach jeder Aktion neu geliefert) */
function templateState(): TemplateState {
  const vault = getSettingsVault()
  return {
    vault,
    templatesRoot: templatesRoot(),
    templates: listTemplates(),
    assigned: vault ? getVaultTemplateName(vault) : null
  }
}

function registerIpc(): void {
  ipcMain.on('app:locale', event => { event.returnValue = getLocale() })
  ipcMain.handle('app:getInitialVault', (event) => {
    const win = winFromEvent(event)
    if (!win) return null
    let vault = getWindowVault(win.id)
    if (!vault && process.env.MERKZEUG_VAULT && existsSync(process.env.MERKZEUG_VAULT)) {
      vault = process.env.MERKZEUG_VAULT
    }
    if (!vault) {
      const last = getLastVault()
      if (last && existsSync(last)) vault = last
    }
    if (vault) {
      // Vault aus der Umgebung (Debug-/Testläufe) nicht in den Einstellungen speichern
      const fromEnv = vault === process.env.MERKZEUG_VAULT
      setWindowVault(win.id, vault)
      if (!fromEnv) addRecentVault(vault)
      watchVault(win, vault)
      rebuildMenu()
    }
    return vault
  })

  ipcMain.handle('dialog:pickVault', async (event) => {
    const win = winFromEvent(event) ?? undefined
    const vault = await pickVault(win)
    if (vault && win) assignVault(win, vault)
    return vault
  })

  ipcMain.handle('vault:tree', (_e, vault: string) => readTree(vault))
  const revisions = new Map<Electron.WebContents, FileRevisions>()
  const filesFor = (sender: Electron.WebContents): FileRevisions => {
    let files = revisions.get(sender)
    if (!files) {
      files = new FileRevisions(); revisions.set(sender, files)
      sender.once('destroyed', () => revisions.delete(sender))
    }
    return files
  }
  ipcMain.handle('file:read', (event, path: string, options?: { peek?: boolean }) => filesFor(event.sender).read(path, options))
  ipcMain.handle('file:write', (event, path: string, content: string) => filesFor(event.sender).write(path, content))
  ipcMain.handle('file:createNote', (_e, dir: string) => createNote(dir))
  ipcMain.handle('file:createNoteFrom', (_e, dir: string, base: string, content: string) =>
    createNoteFrom(dir, base, content)
  )
  ipcMain.handle('file:createFolder', (_e, dir: string) => createFolder(dir))
  ipcMain.handle('calendar:list', (_e, fromMs: number, toMs: number) =>
    listCalendarEvents(fromMs, toMs)
  )
  ipcMain.handle('calendar:detail', (_e, event: CalendarEvent) => calendarEventDetail(event))
  const moved = (source: string, target: string): string => {
    for (const files of revisions.values()) files.move(source, target)
    return target
  }
  ipcMain.handle('file:rename', (_e, path: string, newName: string) => moved(path, renamePath(path, newName)))
  ipcMain.handle('file:autoRename', (_e, path: string, base: string) => moved(path, autoRenameNote(path, base)))
  ipcMain.handle('file:move', (_e, src: string, destDir: string) => moved(src, movePath(src, destDir)))
  ipcMain.handle('file:trash', (_e, path: string) => trashPath(path))
  ipcMain.handle('file:exists', (_e, path: string) => existsSync(path))
  ipcMain.handle('file:showInFolder', (_e, path: string) => shell.showItemInFolder(path))
  ipcMain.handle('assets:saveImage', (_e, notePath: string, base64: string, ext: string) =>
    saveImage(notePath, base64, ext)
  )
  ipcMain.handle('git:status', (_e, vault: string) => gitStatus(vault))
  ipcMain.handle('git:commitPush', (_e, vault: string, message: string) =>
    gitCommitPush(vault, message)
  )
  ipcMain.handle('git:push', (_e, vault: string) => gitPush(vault))
  ipcMain.handle('git:pull', (_e, vault: string) => gitPull(vault))
  ipcMain.handle('recents:get', () => getRecentVaults())
  ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))
  ipcMain.handle('window:new', () => newWindow())
  ipcMain.handle('window:close', (event) => winFromEvent(event)?.close())
  ipcMain.handle('window:setTitle', (event, title: string) => winFromEvent(event)?.setTitle(title))
  ipcMain.handle('help:read', (_e, lang: string) => {
    const file = lang === 'en' ? 'Help.en.md' : 'Help.de.md'
    const base = app.isPackaged
      ? join(process.resourcesPath, 'help')
      : join(app.getAppPath(), 'resources', 'help')
    return readFileSync(join(base, file), 'utf8')
  })
  ipcMain.handle('help:open', () => openHelpWindow())

  // Einstellungs-Fenster: PDF-Vorlagen verwalten und dem Vault zuweisen
  ipcMain.handle('tpl:state', () => templateState())
  ipcMain.handle('tpl:pickRoot', async (event) => {
    const win = winFromEvent(event) ?? undefined
    const options: Electron.OpenDialogOptions = {
      title: translate("Choose templates folder"),
      securityScopedBookmarks: !!process.mas,
    properties: ['openDirectory', 'createDirectory']
    }
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (!res.canceled && res.filePaths[0]) {
      rememberFolderAccess(res.filePaths[0], res.bookmarks?.[0])
      setStoredTemplatesRoot(res.filePaths[0])
    }
    return templateState()
  })
  ipcMain.handle('tpl:create', (_e, name: string) => {
    const dir = createTemplate(name)
    void shell.openPath(dir)
    return templateState()
  })
  ipcMain.handle('tpl:assign', (_e, name: string | null) => {
    const vault = getSettingsVault()
    if (vault) setVaultTemplateName(vault, name)
    return templateState()
  })
  ipcMain.handle('tpl:showRoot', () => {
    const root = templatesRoot()
    mkdirSync(root, { recursive: true })
    void shell.openPath(root)
  })
  ipcMain.handle('tpl:showTemplate', (_e, name: string) =>
    shell.openPath(join(templatesRoot(), name))
  )

  registerPdfIpc()
  ipcMain.handle('zoom:openMermaid', (_e, svg: string) => openMermaidZoom(svg))

  // Synchrones Speichern für beforeunload (Fenster-/App-Schluss)
  ipcMain.on('file:writeSync', (event, path: string, content: string) => {
    try {
      filesFor(event.sender).write(path, content)
      event.returnValue = true
    } catch {
      event.returnValue = false
    }
  })
}

// Screenshot runs use an explicitly isolated profile, never the user's normal settings.
if (process.env.MERKZEUG_SCREENSHOT && process.env.MERKZEUG_SCREENSHOT_PROFILE) {
  mkdirSync(process.env.MERKZEUG_SCREENSHOT_PROFILE, { recursive: true })
  app.setPath('userData', process.env.MERKZEUG_SCREENSHOT_PROFILE)
  nativeTheme.themeSource = 'light'
}

app.whenReady().then(() => {
  setLocale(app.commandLine.getSwitchValue('lang') || app.getLocale())
  restoreFolderAccess()
  electronApp.setAppUserModelId('com.creative-it.merkzeug')

  protocol.handle('vault-file', (request) => {
    const path = vaultFilePath(request.url, process.platform)
    if (!/\.(png|jpe?g|gif|webp|svg|bmp|tiff?|avif|heic)$/i.test(path)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(path).toString())
  })

  app.on('browser-window-created', (_, window) => {
    // Nur im Dev-Modus (F12 für DevTools): im Release-Build blockiert
    // watchWindowShortcuts sonst ⌘R und damit den Navigationsmodus-Shortcut.
    if (is.dev) optimizer.watchWindowShortcuts(window)
  })

  registerIpc()
  rebuildMenu()

  const envVault =
    process.env.MERKZEUG_VAULT && existsSync(process.env.MERKZEUG_VAULT)
      ? process.env.MERKZEUG_VAULT
      : null
  const mainWin = createMainWindow(envVault)

  // Debug-Hook: Screenshot aufnehmen und beenden (MERKZEUG_SCREENSHOT=/pfad.png).
  // MERKZEUG_CLICK="Schritt1,Schritt2": "menu:<aktion>" schickt eine Menü-Aktion,
  // "js:<code>" führt JS im Renderer aus, alles andere klickt den Baum-Eintrag an.
  if (process.env.MERKZEUG_SCREENSHOT) {
    const target = process.env.MERKZEUG_SCREENSHOT
    mainWin.setContentSize(1280, 800)
    setTimeout(async () => {
      try {
        // warten, bis der Dateibaum gerendert ist
        for (let i = 0; i < 20; i++) {
          const ready = await mainWin.webContents.executeJavaScript(
            `document.querySelectorAll('.tree-row').length > 0`
          )
          if (ready) break
          await new Promise((r) => setTimeout(r, 1000))
        }
        for (const step of (process.env.MERKZEUG_CLICK ?? '').split(';;').filter(Boolean)) {
          if (step === 'settingswindow') {
            openSettingsWindow(getWindowVault(mainWin.id))
            await new Promise((r) => setTimeout(r, 3000))
            const settingsWin = BrowserWindow.getAllWindows().find((w) => w !== mainWin)
            if (settingsWin) {
              const image = await settingsWin.webContents.capturePage()
              const { writeFileSync } = await import('node:fs')
              writeFileSync(target.replace('.png', '-settings.png'), image.toPNG())
              settingsWin.close()
            }
          } else if (step === 'helpwindow') {
            openHelpWindow()
            await new Promise((r) => setTimeout(r, 5000))
            const helpWin = BrowserWindow.getAllWindows().find((w) => w !== mainWin)
            if (helpWin) {
              const image = await helpWin.webContents.capturePage()
              const { writeFileSync } = await import('node:fs')
              writeFileSync(target.replace('.png', '-help.png'), image.toPNG())
              helpWin.close()
            }
          } else if (step === 'windows') {
            console.log(
              '[windows]',
              BrowserWindow.getAllWindows()
                .map((w) => w.getTitle())
                .join(' | ')
            )
          } else if (step.startsWith('menu:')) {
            mainWin.webContents.send('menu:action', { action: step.slice(5) })
          } else if (step.startsWith('js:')) {
            const result = await mainWin.webContents.executeJavaScript(step.slice(3))
            if (result !== undefined) console.log('[js]', JSON.stringify(result))
          } else {
            await mainWin.webContents.executeJavaScript(
              `[...document.querySelectorAll('.tree-row .tree-label')]
                 .find(el => el.textContent === ${JSON.stringify(step)})
                 ?.closest('.tree-row')
                 ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`
            )
          }
          await new Promise((r) => setTimeout(r, 2500))
        }
        mainWin.show()
        mainWin.focus()
        const selector = process.env.MERKZEUG_SCREENSHOT_READY
        if (selector) {
          let ready = false
          for (let attempt = 0; attempt < 40; attempt++) {
            ready = await mainWin.webContents.executeJavaScript(
              `Boolean(document.querySelector(${JSON.stringify(selector)}))`
            )
            if (ready) break
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          if (!ready) throw new Error('Screenshot content did not finish rendering.')
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        const { writeFileSync } = await import('node:fs')
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            const image = await mainWin.webContents.capturePage()
            if (image.toPNG().length > 20_000) {
              writeFileSync(target, image.toPNG())
              break
            }
          } catch {
            // erneut versuchen
          }
          await new Promise((r) => setTimeout(r, 1500))
        }
      } finally {
        app.exit(0)
      }
    }, 8000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(null)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

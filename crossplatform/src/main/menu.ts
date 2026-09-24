import { supportUrl } from '@merkzeug/core/support'
import { t as translate } from '@merkzeug/core/i18n'
import { app, shell, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import type { MenuAction } from '../shared/types'
import { getRecentVaults } from './settings'

interface MenuHooks {
  newWindow: () => void
  openVault: (win: BrowserWindow | undefined) => void
  openRecent: (win: BrowserWindow | undefined, path: string) => void
  openHelp: () => void
  openSettings: (win: BrowserWindow | undefined) => void
}

function send(action: MenuAction): void {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:action', { action })
}

function item(
  label: string,
  action: MenuAction,
  accelerator?: string
): MenuItemConstructorOptions {
  return { label, accelerator, click: () => send(action) }
}

export function buildMenu(hooks: MenuHooks): void {
  const isDev = !app.isPackaged
  const recents = getRecentVaults()

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Merkzeug',
      submenu: [
        { role: 'about', label: translate("About Merkzeug") },
        { type: 'separator' },
        {
          label: translate("Settings…"),
          accelerator: 'CmdOrCtrl+,',
          click: () => hooks.openSettings(BrowserWindow.getFocusedWindow() ?? undefined)
        },
        { type: 'separator' },
        { role: 'hide', label: translate("Hide Merkzeug") },
        { role: 'hideOthers', label: translate("Hide Others") },
        { role: 'unhide', label: translate("Show All") },
        { type: 'separator' },
        { role: 'quit', label: translate("Quit Merkzeug") }
      ]
    },
    {
      label: translate("File"),
      submenu: [
        {
          label: translate("New Window"),
          accelerator: 'Alt+CmdOrCtrl+N',
          click: () => hooks.newWindow()
        },
        item(translate("New note"), 'newNote', 'CmdOrCtrl+N'),
        item(translate("New Meeting Note…"), 'newMeetingNote', process.platform === 'darwin' ? 'Ctrl+Cmd+N' : 'Ctrl+Alt+Shift+N'),
        item(translate("New folder"), 'newFolder', 'Shift+CmdOrCtrl+N'),
        { type: 'separator' },
        item(translate("Save"), 'saveNote', 'CmdOrCtrl+S'),
        item(translate("Save All"), 'saveAll', 'Alt+CmdOrCtrl+S'),
        { type: 'separator' },
        item(translate("Print…"), 'printNote', 'CmdOrCtrl+P'),
        item(translate("Export as PDF…"), 'exportPdf'),
        { type: 'separator' },
        {
          label: translate("Open Vault…"),
          accelerator: 'CmdOrCtrl+O',
          click: () => hooks.openVault(BrowserWindow.getFocusedWindow() ?? undefined)
        },
        {
          label: translate("Recent Vaults"),
          submenu:
            recents.length === 0
              ? [{ label: translate("No entries"), enabled: false }]
              : recents.map((path) => ({
                  label: path,
                  click: () =>
                    hooks.openRecent(BrowserWindow.getFocusedWindow() ?? undefined, path)
                }))
        },
        { type: 'separator' },
        item(translate("Close Tab"), 'closeTab', 'CmdOrCtrl+W'),
        { role: 'close', label: translate("Close Window"), accelerator: 'Shift+CmdOrCtrl+W' }
      ]
    },
    {
      label: translate("Edit"),
      submenu: [
        item(translate("Undo"), 'undo', 'CmdOrCtrl+Z'),
        item(translate("Redo"), 'redo', 'Shift+CmdOrCtrl+Z'),
        { type: 'separator' },
        { role: 'cut', label: translate("Cut") },
        { role: 'copy', label: translate("Copy") },
        { role: 'paste', label: translate("Paste") },
        { role: 'selectAll', label: translate("Select All") },
        { type: 'separator' },
        item(translate("Find…"), 'find', 'CmdOrCtrl+F'),
        item(translate("Find and Replace…"), 'findReplace', 'Alt+CmdOrCtrl+F'),
        { type: 'separator' },
        item(translate("Insert Link…"), 'insertLink', 'CmdOrCtrl+K'),
        item(translate("Insert Image…"), 'insertImage'),
        item(translate("Insert Table"), 'insertTable', 'Alt+CmdOrCtrl+T')
      ]
    },
    {
      label: translate("Table"),
      submenu: [
        item(translate("Insert Row Above"), 'tableRowAbove'),
        item(translate("Insert Row Below"), 'tableRowBelow'),
        item(translate("Insert Column Before"), 'tableColBefore'),
        item(translate("Insert Column After"), 'tableColAfter'),
        { type: 'separator' },
        item(translate("Delete Row"), 'tableDeleteRow'),
        item(translate("Delete Column"), 'tableDeleteCol')
      ]
    },
    {
      label: translate("View"),
      submenu: [
        item(translate("Navigation mode"), 'toggleNavMode', 'CmdOrCtrl+R'),
        item(translate("Back"), 'navBack', 'CmdOrCtrl+['),
        item(translate("Forward"), 'navForward', 'CmdOrCtrl+]'),
        { type: 'separator' },
        item(translate("Two Panes"), 'toggleSplit', 'CmdOrCtrl+\\'),
        item(translate("Move Tab to Other Pane"), 'moveTabOtherPane', 'Shift+CmdOrCtrl+\\'),
        { type: 'separator' },
        item(translate("Show/Hide Asset Folders"), 'toggleAssets', 'Shift+CmdOrCtrl+R'),
        ...(isDev
          ? ([
              { type: 'separator' },
              { role: 'reload', label: translate("Reload (Dev)"), accelerator: 'Alt+CmdOrCtrl+R' },
              { role: 'toggleDevTools', label: translate("Developer Tools"), accelerator: 'Alt+CmdOrCtrl+I' }
            ] as MenuItemConstructorOptions[])
          : [])
      ]
    },
    {
      label: translate("Window"),
      role: 'windowMenu',
      submenu: [
        { role: 'minimize', label: translate("Minimize") },
        { role: 'zoom', label: translate("Zoom") },
        { type: 'separator' },
        { role: 'front', label: translate("Bring All to Front") }
      ]
    },
    {
      label: translate("Help"),
      role: 'help',
      submenu: [
        item(translate("Guided tour"), 'guidedTour'),
        item(translate("Desktop tour video (German)"), 'tourVideo'),
        { type: 'separator' },
        {
          label: translate("Merkzeug Help"),
          accelerator: process.platform === 'darwin' ? 'Cmd+?' : 'F1',
          click: () => hooks.openHelp()
        },
        {
          label: translate("Contact Support…"),
          click: () => { void shell.openExternal(supportUrl(app.getLocale(), `desktop-${process.platform}`, app.getVersion())) }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

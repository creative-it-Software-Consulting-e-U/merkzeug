import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
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
        { role: 'about', label: 'Über Merkzeug' },
        { type: 'separator' },
        {
          label: 'Einstellungen…',
          accelerator: 'Cmd+,',
          click: () => hooks.openSettings(BrowserWindow.getFocusedWindow() ?? undefined)
        },
        { type: 'separator' },
        { role: 'hide', label: 'Merkzeug ausblenden' },
        { role: 'hideOthers', label: 'Andere ausblenden' },
        { role: 'unhide', label: 'Alle einblenden' },
        { type: 'separator' },
        { role: 'quit', label: 'Merkzeug beenden' }
      ]
    },
    {
      label: 'Ablage',
      submenu: [
        {
          label: 'Neues Fenster',
          accelerator: 'Alt+Cmd+N',
          click: () => hooks.newWindow()
        },
        item('Neue Notiz', 'newNote', 'Cmd+N'),
        item('Neue Meeting-Notiz…', 'newMeetingNote', 'Ctrl+Cmd+N'),
        item('Neuer Ordner', 'newFolder', 'Shift+Cmd+N'),
        { type: 'separator' },
        item('Sichern', 'saveNote', 'Cmd+S'),
        item('Alle sichern', 'saveAll', 'Alt+Cmd+S'),
        { type: 'separator' },
        item('Als PDF exportieren…', 'exportPdf', 'Cmd+P'),
        { type: 'separator' },
        {
          label: 'Vault öffnen…',
          accelerator: 'Cmd+O',
          click: () => hooks.openVault(BrowserWindow.getFocusedWindow() ?? undefined)
        },
        {
          label: 'Zuletzt geöffnete Vaults',
          submenu:
            recents.length === 0
              ? [{ label: 'Keine Einträge', enabled: false }]
              : recents.map((path) => ({
                  label: path,
                  click: () =>
                    hooks.openRecent(BrowserWindow.getFocusedWindow() ?? undefined, path)
                }))
        },
        { type: 'separator' },
        item('Tab schließen', 'closeTab', 'Cmd+W'),
        { role: 'close', label: 'Fenster schließen', accelerator: 'Shift+Cmd+W' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        item('Widerrufen', 'undo', 'Cmd+Z'),
        item('Wiederholen', 'redo', 'Shift+Cmd+Z'),
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einsetzen' },
        { role: 'selectAll', label: 'Alles auswählen' },
        { type: 'separator' },
        item('Suchen…', 'find', 'Cmd+F'),
        item('Suchen und Ersetzen…', 'findReplace', 'Alt+Cmd+F'),
        { type: 'separator' },
        item('Link einfügen…', 'insertLink', 'Cmd+K'),
        item('Bild einfügen…', 'insertImage'),
        item('Tabelle einfügen', 'insertTable', 'Alt+Cmd+T')
      ]
    },
    {
      label: 'Tabelle',
      submenu: [
        item('Zeile darüber einfügen', 'tableRowAbove'),
        item('Zeile darunter einfügen', 'tableRowBelow'),
        item('Spalte davor einfügen', 'tableColBefore'),
        item('Spalte danach einfügen', 'tableColAfter'),
        { type: 'separator' },
        item('Zeile löschen', 'tableDeleteRow'),
        item('Spalte löschen', 'tableDeleteCol')
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        item('Navigationsmodus', 'toggleNavMode', 'Cmd+R'),
        item('Zurück', 'navBack', 'Cmd+['),
        item('Vorwärts', 'navForward', 'Cmd+]'),
        { type: 'separator' },
        item('Zwei Sektionen', 'toggleSplit', 'Cmd+\\'),
        item('Tab in andere Sektion verschieben', 'moveTabOtherPane', 'Shift+Cmd+\\'),
        { type: 'separator' },
        item('Ressourcen-Ordner ein-/ausblenden', 'toggleAssets', 'Shift+Cmd+R'),
        ...(isDev
          ? ([
              { type: 'separator' },
              { role: 'reload', label: 'Neu laden (Dev)', accelerator: 'Alt+Cmd+R' },
              { role: 'toggleDevTools', label: 'Entwicklertools', accelerator: 'Alt+Cmd+I' }
            ] as MenuItemConstructorOptions[])
          : [])
      ]
    },
    {
      label: 'Fenster',
      role: 'windowMenu',
      submenu: [
        { role: 'minimize', label: 'Im Dock ablegen' },
        { role: 'zoom', label: 'Zoomen' },
        { type: 'separator' },
        { role: 'front', label: 'Alle nach vorne bringen' }
      ]
    },
    {
      label: 'Hilfe',
      role: 'help',
      submenu: [
        {
          label: 'Merkzeug-Hilfe',
          accelerator: 'Cmd+?',
          click: () => hooks.openHelp()
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

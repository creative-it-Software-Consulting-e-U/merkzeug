import { contextBridge, ipcRenderer } from 'electron'
import type {
  CalendarResult,
  FileNode,
  GitResult,
  GitStatus,
  MenuAction,
  PdfDoc,
  PdfExportProgress,
  PdfTemplate,
  TemplateState
} from '../shared/types'

const api = {
  getInitialVault: (): Promise<string | null> => ipcRenderer.invoke('app:getInitialVault'),
  pickVault: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickVault'),
  readTree: (vault: string): Promise<FileNode> => ipcRenderer.invoke('vault:tree', vault),
  readFile: (path: string): Promise<string> => ipcRenderer.invoke('file:read', path),
  writeFile: (path: string, content: string): Promise<void> =>
    ipcRenderer.invoke('file:write', path, content),
  createNote: (dir: string): Promise<string> => ipcRenderer.invoke('file:createNote', dir),
  createNoteFrom: (dir: string, base: string, content: string): Promise<string> =>
    ipcRenderer.invoke('file:createNoteFrom', dir, base, content),
  listCalendarEvents: (fromMs: number, toMs: number): Promise<CalendarResult> =>
    ipcRenderer.invoke('calendar:list', fromMs, toMs),
  createFolder: (dir: string): Promise<string> => ipcRenderer.invoke('file:createFolder', dir),
  renamePath: (path: string, newName: string): Promise<string> =>
    ipcRenderer.invoke('file:rename', path, newName),
  autoRenameNote: (path: string, base: string): Promise<string> =>
    ipcRenderer.invoke('file:autoRename', path, base),
  movePath: (src: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke('file:move', src, destDir),
  trashPath: (path: string): Promise<void> => ipcRenderer.invoke('file:trash', path),
  fileExists: (path: string): Promise<boolean> => ipcRenderer.invoke('file:exists', path),
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke('file:showInFolder', path),
  saveImage: (notePath: string, base64: string, ext: string): Promise<string> =>
    ipcRenderer.invoke('assets:saveImage', notePath, base64, ext),
  gitStatus: (vault: string): Promise<GitStatus> => ipcRenderer.invoke('git:status', vault),
  gitCommitPush: (vault: string, message: string): Promise<GitResult> =>
    ipcRenderer.invoke('git:commitPush', vault, message),
  gitPush: (vault: string): Promise<GitResult> => ipcRenderer.invoke('git:push', vault),
  gitPull: (vault: string): Promise<GitResult> => ipcRenderer.invoke('git:pull', vault),
  getRecentVaults: (): Promise<string[]> => ipcRenderer.invoke('recents:get'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  newWindow: (): Promise<void> => ipcRenderer.invoke('window:new'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  setTitle: (title: string): Promise<void> => ipcRenderer.invoke('window:setTitle', title),
  readHelp: (lang: string): Promise<string> => ipcRenderer.invoke('help:read', lang),
  openHelp: (): Promise<void> => ipcRenderer.invoke('help:open'),
  writeFileSync: (path: string, content: string): boolean =>
    ipcRenderer.sendSync('file:writeSync', path, content),
  openMermaidZoom: (svg: string): Promise<void> => ipcRenderer.invoke('zoom:openMermaid', svg),
  exportPdf: (path: string): Promise<void> => ipcRenderer.invoke('pdf:export', path),
  exportPdfMulti: (paths: string[]): Promise<void> => ipcRenderer.invoke('pdf:exportMulti', paths),
  // nur für das unsichtbare PDF-Fenster (#pdf)
  getPdfDocs: (): Promise<{
    vault: string | null
    docs: PdfDoc[]
    template: PdfTemplate | null
  }> => ipcRenderer.invoke('pdf:getDocs'),
  pdfReady: (landscape: boolean): void => ipcRenderer.send('pdf:ready', landscape),
  pdfProgress: (done: number, total: number): void => ipcRenderer.send('pdf:progress', done, total),
  onPdfExportProgress: (handler: (progress: PdfExportProgress) => void): (() => void) => {
    const listener = (_e: unknown, progress: PdfExportProgress): void => handler(progress)
    ipcRenderer.on('pdf:exportProgress', listener)
    return () => ipcRenderer.removeListener('pdf:exportProgress', listener)
  },

  // Einstellungs-Fenster (#settings): PDF-Vorlagen verwalten
  getTemplateState: (): Promise<TemplateState> => ipcRenderer.invoke('tpl:state'),
  pickTemplatesRoot: (): Promise<TemplateState> => ipcRenderer.invoke('tpl:pickRoot'),
  createTemplate: (name: string): Promise<TemplateState> => ipcRenderer.invoke('tpl:create', name),
  assignTemplate: (name: string | null): Promise<TemplateState> =>
    ipcRenderer.invoke('tpl:assign', name),
  showTemplatesRoot: (): Promise<void> => ipcRenderer.invoke('tpl:showRoot'),
  showTemplate: (name: string): Promise<void> => ipcRenderer.invoke('tpl:showTemplate', name),
  onSettingsRefresh: (handler: () => void): (() => void) => {
    const listener = (): void => handler()
    ipcRenderer.on('settings:refresh', listener)
    return () => ipcRenderer.removeListener('settings:refresh', listener)
  },

  onMenuAction: (handler: (action: MenuAction) => void): (() => void) => {
    const listener = (_e: unknown, payload: { action: MenuAction }): void => handler(payload.action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  },
  onVaultSet: (handler: (vault: string) => void): (() => void) => {
    const listener = (_e: unknown, payload: { vault: string }): void => handler(payload.vault)
    ipcRenderer.on('vault:set', listener)
    return () => ipcRenderer.removeListener('vault:set', listener)
  },
  onVaultChanged: (handler: (vault: string, paths: string[]) => void): (() => void) => {
    const listener = (_e: unknown, payload: { vault: string; paths?: string[] }): void =>
      handler(payload.vault, payload.paths ?? [])
    ipcRenderer.on('vault:changed', listener)
    return () => ipcRenderer.removeListener('vault:changed', listener)
  },
  onZoomSvg: (handler: (svg: string) => void): (() => void) => {
    const listener = (_e: unknown, payload: string): void =>
      handler(decodeURIComponent(payload))
    ipcRenderer.on('zoom:svg', listener)
    return () => ipcRenderer.removeListener('zoom:svg', listener)
  }
}

export type MerkzeugApi = typeof api

contextBridge.exposeInMainWorld('merkzeug', api)

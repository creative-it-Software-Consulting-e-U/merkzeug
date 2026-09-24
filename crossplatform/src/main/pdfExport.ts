import { t as translate } from '@merkzeug/core/i18n'
import { collectLinkedDocs as collectShared, fillTemplate } from '@merkzeug/core/exportPlan'
import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { frontmatterList, pdfExportTitle, splitFrontmatter } from '../shared/docTitle'
import type { PdfDoc, PdfExportProgress, PdfTemplate } from '../shared/types'
import { getVaultTemplateName, loadTemplate } from './templates'
import { getWindowVault } from './windows'

/** Dokumente je PDF-Fenster (WebContents-ID), vom Renderer per pdf:getDocs abgeholt */
const pendingDocs = new Map<
  number,
  { vault: string | null; docs: PdfDoc[]; template: PdfTemplate | null }
>()
/** Auflöser für das "fertig gerendert"-Signal je PDF-Fenster (Wert: Querformat?) */
const readyResolvers = new Map<number, (landscape: boolean) => void>()
const readyRejectors = new Map<number, (error: Error) => void>()
/**
 * Auslösendes Fenster je PDF-Fenster, für die Fortschrittsanzeige.
 * `base` verschiebt den Fortschritt beim Multi-Export: `done` bereits
 * abgeschlossene Schritte, `total` Gesamtschritte über alle Dateien.
 */
const sourceWindows = new Map<
  number,
  { win: BrowserWindow; base?: { done: number; total: number } }
>()

function sendProgress(win: BrowserWindow, progress: PdfExportProgress): void {
  if (!win.isDestroyed()) win.webContents.send('pdf:exportProgress', progress)
}

async function collectLinkedDocs(indexPath: string, vault: string | null): Promise<string[]> {
  return collectShared(indexPath, readFileSync(indexPath, 'utf8'), vault, async (path) => existsSync(path))
}
function applyPlaceholders(template: PdfTemplate, notePath: string, withLinked: boolean): PdfTemplate {
  return fillTemplate(template, readFileSync(notePath, 'utf8'), basename(notePath, '.md'), withLinked)
}

const mmToInch = (mm: number): number => mm / 25.4

async function renderPdf(
  vault: string | null,
  docs: PdfDoc[],
  template: PdfTemplate | null,
  sourceWin: BrowserWindow,
  progressBase?: { done: number; total: number }
): Promise<Buffer> {
  const pdfWin = new BrowserWindow({
    show: false,
    width: 820,
    height: 1100,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // unsichtbares Fenster: ohne dies drosselt Chromium Timer/rAF und
      // Mermaid-Renderings laufen in den Timeout
      backgroundThrottling: false
    }
  })
  try {
    pendingDocs.set(pdfWin.webContents.id, { vault, docs, template })
    sourceWindows.set(pdfWin.webContents.id, { win: sourceWin, base: progressBase })
    const ready = new Promise<boolean>((resolveReady, rejectReady) => {
      // Rendering abbrechen, statt unvollständige Dokumente zu drucken.
      const timer = setTimeout(() => {
        readyResolvers.delete(pdfWin.webContents.id)
        rejectReady(new Error(translate("PDF rendering timed out")))
      }, 60_000 + docs.length * 5_000)
      readyRejectors.set(pdfWin.webContents.id, error => { clearTimeout(timer); rejectReady(error) })
      readyResolvers.set(pdfWin.webContents.id, (landscape) => {
        clearTimeout(timer)
        resolveReady(landscape)
      })
    })
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      await pdfWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}#pdf`)
    } else {
      await pdfWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'pdf' })
    }
    // Querformat, wenn ein Dokument Tabellen enthält, die im Hochformat
    // abgeschnitten würden (misst das PDF-Fenster nach dem Rendern)
    const landscape = await ready
    sendProgress(sourceWin, {
      phase: 'print',
      done: progressBase ? progressBase.done + docs.length : docs.length,
      total: progressBase ? progressBase.total : docs.length + 1
    })
    const options: Electron.PrintToPDFOptions = {
      printBackground: true,
      pageSize: 'A4',
      landscape
    }
    if (template) {
      if (template.header || template.footer) {
        options.displayHeaderFooter = true
        // Chromium verlangt beide Templates, sonst erscheint sein Standard-Text
        options.headerTemplate = template.header ?? '<span></span>'
        options.footerTemplate = template.footer ?? '<span></span>'
      }
      if (template.margins) {
        options.margins = {
          top: mmToInch(template.margins.top),
          bottom: mmToInch(template.margins.bottom),
          left: mmToInch(template.margins.left),
          right: mmToInch(template.margins.right)
        }
      }
    }
    return await pdfWin.webContents.printToPDF(options)
  } finally {
    readyRejectors.delete(pdfWin.webContents.id)
    pendingDocs.delete(pdfWin.webContents.id)
    readyResolvers.delete(pdfWin.webContents.id)
    sourceWindows.delete(pdfWin.webContents.id)
    pdfWin.destroy()
  }
}

async function exportPdf(win: BrowserWindow, notePath: string, print = false): Promise<void> {
  // Debug-/Testmodus: Ziel aus der Umgebung, keine Dialoge
  const debugTarget = print ? undefined : process.env.MERKZEUG_PDF_TARGET
  const vault = getWindowVault(win.id)

  // Vorlage: dem Vault zugewiesen (Debug-/Testläufe: aus der Umgebung)
  const templateName =
    process.env.MERKZEUG_PDF_TEMPLATE ?? (vault ? getVaultTemplateName(vault) : null)
  let template: PdfTemplate | null = null
  if (templateName) {
    template = loadTemplate(templateName, vault)
    if (!template && !debugTarget) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        title: translate("PDF template not found"),
        message: `${translate("The assigned template “")}${templateName}${translate("” is not in the templates folder.")}`,
        detail:
          translate("The PDF will use the default layout. Manage templates in Merkzeug → Settings (⌘,)."),
        buttons: [translate("Export without a template"), translate("Cancel")],
        defaultId: 0,
        cancelId: 1
      })
      if (response === 1) return
    }
  }

  let linked: string[] = []
  try {
    linked = await collectLinkedDocs(notePath, vault)
  } catch {
    /* Datei nicht lesbar → wie "keine Links" behandeln */
  }

  let withLinked = false
  if (linked.length > 0) {
    if (debugTarget) {
      withLinked = true
    } else {
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        title: translate("Export as PDF"),
        message: translate("What should the PDF include?"),
        detail: `„${basename(notePath, '.md')}${translate("” links to")} ${linked.length} weitere ${
          linked.length === 1 ? translate("Document") : translate("documents")
        } ${translate("in the same hierarchy. Linked documents are appended alphabetically.")}`,
        buttons: [translate("This file only"), `${translate("Include linked documents (")}${linked.length + 1})`, translate("Cancel")],
        defaultId: 1,
        cancelId: 2
      })
      if (response === 2) return
      withLinked = response === 1
    }
  }
  // Platzhalter erst jetzt ersetzen: {{titel}} hängt davon ab, ob mit
  // verlinkten Dokumenten exportiert wird (pdf-linked-title: im Frontmatter)
  if (template) template = applyPlaceholders(template, notePath, withLinked)

  let target = debugTarget ?? null
  if (!target && !print) {
    // Nur der Dateiname als defaultPath: so wählt das System den Ordner
    // (zuletzt verwendetes Verzeichnis, wie unter macOS üblich) — ein
    // kompletter Pfad würde den Dialog jedes Mal in denselben Ordner zwingen
    const res = await dialog.showSaveDialog(win, {
      title: translate("Save PDF"),
      defaultPath: `${basename(notePath, '.md')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (res.canceled || !res.filePath) return
    target = res.filePath
  }

  try {
    const files = withLinked ? [notePath, ...linked] : [notePath]
    const docs: PdfDoc[] = files.map((p) => ({ path: p, content: readFileSync(p, 'utf8') }))
    sendProgress(win, { phase: 'start', done: 0, total: docs.length + 1 })
    const data = await renderPdf(vault, docs, template, win)
    if (print) await printPdfDocument(win, data)
    else writeFileSync(target!, data)
  } catch (err) {
    sendProgress(win, { phase: 'error' })
    if (debugTarget) throw err
    dialog.showErrorBox(translate("PDF export failed"), String(err))
    return
  }
  sendProgress(win, { phase: 'done' })
  if (!debugTarget && !print) shell.showItemInFolder(target!)
}

/** Print the generated PDF itself, including template headers and pagination. */
async function printPdfDocument(parent: BrowserWindow, data: Buffer): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'merkzeug-print-'))
  const file = join(directory, 'document.pdf')
  writeFileSync(file, data)
  const preview = new BrowserWindow({ parent, width: 1000, height: 800,
    title: translate("Print"), webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } })
  preview.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  preview.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key.toLowerCase() === 'p' && (input.control || input.meta)) {
      event.preventDefault()
      preview.webContents.print({ silent: false, printBackground: true })
    }
  })
  preview.on('closed', () => rmSync(directory, { recursive: true, force: true }))
  try {
    await preview.loadFile(file)
    // Current Electron supports printing the embedded PDF viewer. Keep the preview
    // alive after submitting/cancelling so its toolbar can also print again.
    preview.webContents.print({ silent: false, printBackground: true }, (ok, reason) => {
      if (!ok && reason && !/cancel/i.test(reason) && !preview.isDestroyed()) {
        void dialog.showMessageBox(preview, { type: 'error', message: translate("Printing failed"), detail: reason })
      }
    })
  } catch (error) { preview.destroy(); throw error }
}

/**
 * Exportiert mehrere Notizen einzeln als PDF in einen wählbaren Zielordner
 * (je Datei ein PDF mit dem Namen der Notiz). Verlinkte Dokumente werden
 * dabei nicht angehängt — jede Datei wird für sich exportiert.
 */
async function exportPdfMulti(win: BrowserWindow, notePaths: string[]): Promise<void> {
  if (notePaths.length === 0) return
  // Debug-/Testmodus: Zielordner aus der Umgebung, keine Dialoge
  const debugTarget = process.env.MERKZEUG_PDF_TARGET
  const vault = getWindowVault(win.id)

  const templateName =
    process.env.MERKZEUG_PDF_TEMPLATE ?? (vault ? getVaultTemplateName(vault) : null)
  let template: PdfTemplate | null = null
  if (templateName) {
    template = loadTemplate(templateName, vault)
    if (!template && !debugTarget) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        title: translate("PDF template not found"),
        message: `${translate("The assigned template “")}${templateName}${translate("” is not in the templates folder.")}`,
        detail:
          translate("The PDF will use the default layout. Manage templates in Merkzeug → Settings (⌘,)."),
        buttons: [translate("Export without a template"), translate("Cancel")],
        defaultId: 0,
        cancelId: 1
      })
      if (response === 1) return
    }
  }

  let chosenDir = debugTarget ?? null
  if (!chosenDir) {
    const res = await dialog.showOpenDialog(win, {
      title: translate("Choose a PDF export folder"),
      buttonLabel: translate("Export"),
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return
    chosenDir = res.filePaths[0]
  }
  const targetDir = chosenDir

  const files = [...notePaths].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
  const targetFor = (p: string): string => join(targetDir, `${basename(p, '.md')}.pdf`)
  const existing = files.filter((p) => existsSync(targetFor(p)))
  if (existing.length > 0 && !debugTarget) {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: translate("Overwrite existing PDFs?"),
      message:
        existing.length === 1
          ? `„${basename(targetFor(existing[0]))}${translate("” already exists in the destination.")}`
          : `${existing.length} ${translate("PDF files already exist in the destination.")}`,
      detail: translate("Exporting will overwrite them."),
      buttons: [translate("Overwrite"), translate("Cancel")],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 1) return
  }

  const total = files.length + 1
  try {
    sendProgress(win, { phase: 'start', done: 0, total })
    for (let i = 0; i < files.length; i++) {
      const p = files[i]
      const docs: PdfDoc[] = [{ path: p, content: readFileSync(p, 'utf8') }]
      const docTemplate = template ? applyPlaceholders(template, p, false) : null
      writeFileSync(
        targetFor(p),
        await renderPdf(vault, docs, docTemplate, win, { done: i, total })
      )
    }
  } catch (err) {
    sendProgress(win, { phase: 'error' })
    if (debugTarget) throw err
    dialog.showErrorBox(translate("PDF export failed"), String(err))
    return
  }
  sendProgress(win, { phase: 'done' })
  if (!debugTarget) shell.showItemInFolder(targetFor(files[0]))
}

const pendingPrints = new Set<number>()

export function registerPdfIpc(): void {
  ipcMain.on('pdf:error', (event, message: string) => readyRejectors.get(event.sender.id)?.(new Error(message)))
  ipcMain.handle('pdf:print', async (event, notePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || pendingPrints.has(win.id)) return
    pendingPrints.add(win.id)
    try { await exportPdf(win, notePath, true) }
    finally { pendingPrints.delete(win.id) }
  })
  ipcMain.handle('pdf:export', async (event, notePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) await exportPdf(win, notePath)
  })
  ipcMain.handle('pdf:exportMulti', async (event, notePaths: string[]) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) await exportPdfMulti(win, notePaths)
  })
  ipcMain.handle(
    'pdf:getDocs',
    (event) => pendingDocs.get(event.sender.id) ?? { vault: null, docs: [], template: null }
  )
  ipcMain.on('pdf:ready', (event, landscape: boolean) => {
    readyResolvers.get(event.sender.id)?.(landscape === true)
    readyResolvers.delete(event.sender.id)
  })
  // Fortschritt aus dem PDF-Fenster an das auslösende Fenster durchreichen
  ipcMain.on('pdf:progress', (event, done: number, total: number) => {
    const source = sourceWindows.get(event.sender.id)
    if (source) {
      sendProgress(source.win, {
        phase: 'render',
        done: source.base ? source.base.done + done : done,
        total: source.base ? source.base.total : total + 1
      })
    }
  })
}

import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { docTitle } from '../shared/docTitle'
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
/** auslösendes Fenster je PDF-Fenster, für die Fortschrittsanzeige */
const sourceWindows = new Map<number, BrowserWindow>()

function sendProgress(win: BrowserWindow, progress: PdfExportProgress): void {
  if (!win.isDestroyed()) win.webContents.send('pdf:exportProgress', progress)
}

function isWithin(dir: string, path: string): boolean {
  const rel = relative(dir, path)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Sammelt alle aus der Index-Datei verlinkten Markdown-Dateien, die in derselben
 * Hierarchie (Ordner der Index-Datei oder darunter) liegen — alphabetisch sortiert.
 */
export function collectLinkedDocs(indexPath: string, vault: string | null): string[] {
  const md = readFileSync(indexPath, 'utf8')
  // Links in Codeblöcken/Inline-Code sind nur Beispieltext
  const scannable = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  const dir = dirname(indexPath)
  const found = new Set<string>()

  const targets: string[] = []
  // Inline-Links [Text](ziel) — Bilder (![...]) auslassen
  for (const m of scannable.matchAll(/(!?)\[[^\]]*\]\(\s*<?([^)>\s]+)>?[^)]*\)/g)) {
    if (m[1] !== '!') targets.push(m[2])
  }
  // Referenz-Definitionen [ref]: ziel
  for (const m of scannable.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)) {
    targets.push(m[1])
  }

  for (const target of targets) {
    if (/^(https?|mailto|ftp|tel|file):/i.test(target)) continue
    let raw: string
    try {
      raw = decodeURI(target).replace(/[?#].*$/, '')
    } catch {
      continue
    }
    if (!raw) continue
    let abs = normalize(raw.startsWith('/') && vault ? join(vault, raw) : join(dir, raw))
    if (!abs.toLowerCase().endsWith('.md')) {
      if (existsSync(`${abs}.md`)) abs = `${abs}.md`
      else continue
    }
    if (!existsSync(abs)) continue
    abs = resolve(abs)
    if (abs === resolve(indexPath)) continue
    if (!isWithin(dir, abs)) continue
    found.add(abs)
  }
  return [...found].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
}

/** Ersetzt {{titel}}/{{datum}} in den HTML-Teilen der Vorlage */
function applyPlaceholders(template: PdfTemplate, notePath: string): PdfTemplate {
  let titel = basename(notePath, '.md')
  try {
    titel = docTitle(readFileSync(notePath, 'utf8'), titel)
  } catch {
    /* Datei nicht lesbar → Dateiname als Titel */
  }
  const datum = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const fill = (s?: string): string | undefined =>
    s?.split('{{titel}}').join(titel).split('{{datum}}').join(datum)
  return {
    ...template,
    header: fill(template.header),
    footer: fill(template.footer),
    cover: fill(template.cover)
  }
}

const mmToInch = (mm: number): number => mm / 25.4

async function renderPdf(
  vault: string | null,
  docs: PdfDoc[],
  template: PdfTemplate | null,
  sourceWin: BrowserWindow
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
    sourceWindows.set(pdfWin.webContents.id, sourceWin)
    const ready = new Promise<boolean>((resolveReady) => {
      // Notbremse: notfalls unfertig drucken; großzügig, skaliert mit der Dokumentzahl
      const timer = setTimeout(() => {
        readyResolvers.delete(pdfWin.webContents.id)
        resolveReady(false)
      }, 60_000 + docs.length * 5_000)
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
    sendProgress(sourceWin, { phase: 'print', done: docs.length, total: docs.length + 1 })
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
    pendingDocs.delete(pdfWin.webContents.id)
    readyResolvers.delete(pdfWin.webContents.id)
    sourceWindows.delete(pdfWin.webContents.id)
    pdfWin.destroy()
  }
}

async function exportPdf(win: BrowserWindow, notePath: string): Promise<void> {
  // Debug-/Testmodus: Ziel aus der Umgebung, keine Dialoge
  const debugTarget = process.env.MERKZEUG_PDF_TARGET
  const vault = getWindowVault(win.id)

  // Vorlage: dem Vault zugewiesen (Debug-/Testläufe: aus der Umgebung)
  const templateName =
    process.env.MERKZEUG_PDF_TEMPLATE ?? (vault ? getVaultTemplateName(vault) : null)
  let template: PdfTemplate | null = null
  if (templateName) {
    template = loadTemplate(templateName)
    if (template) {
      template = applyPlaceholders(template, notePath)
    } else if (!debugTarget) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        title: 'PDF-Vorlage nicht gefunden',
        message: `Die zugewiesene Vorlage „${templateName}“ liegt nicht im Vorlagen-Ordner.`,
        detail:
          'Der Export wird ohne Vorlage erstellt. Vorlagen werden unter Merkzeug → Einstellungen (⌘,) verwaltet.',
        buttons: ['Ohne Vorlage exportieren', 'Abbrechen'],
        defaultId: 0,
        cancelId: 1
      })
      if (response === 1) return
    }
  }

  let linked: string[] = []
  try {
    linked = collectLinkedDocs(notePath, vault)
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
        title: 'Als PDF exportieren',
        message: 'Was soll das PDF enthalten?',
        detail: `„${basename(notePath, '.md')}“ verlinkt ${linked.length} weitere ${
          linked.length === 1 ? 'Dokument' : 'Dokumente'
        } in derselben Hierarchie. Verlinkte Dokumente werden alphabetisch angehängt.`,
        buttons: ['Nur diese Datei', `Mit verlinkten Dokumenten (${linked.length + 1})`, 'Abbrechen'],
        defaultId: 1,
        cancelId: 2
      })
      if (response === 2) return
      withLinked = response === 1
    }
  }

  let target = debugTarget ?? null
  if (!target) {
    const res = await dialog.showSaveDialog(win, {
      title: 'PDF sichern',
      defaultPath: join(dirname(notePath), `${basename(notePath, '.md')}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (res.canceled || !res.filePath) return
    target = res.filePath
  }

  try {
    const files = withLinked ? [notePath, ...linked] : [notePath]
    const docs: PdfDoc[] = files.map((p) => ({ path: p, content: readFileSync(p, 'utf8') }))
    sendProgress(win, { phase: 'start', done: 0, total: docs.length + 1 })
    writeFileSync(target, await renderPdf(vault, docs, template, win))
  } catch (err) {
    sendProgress(win, { phase: 'error' })
    dialog.showErrorBox('PDF-Export fehlgeschlagen', String(err))
    return
  }
  sendProgress(win, { phase: 'done' })
  if (!debugTarget) shell.showItemInFolder(target)
}

export function registerPdfIpc(): void {
  ipcMain.handle('pdf:export', async (event, notePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) await exportPdf(win, notePath)
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
    if (source) sendProgress(source, { phase: 'render', done, total: total + 1 })
  })
}

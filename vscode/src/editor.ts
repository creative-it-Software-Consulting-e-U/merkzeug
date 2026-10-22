import * as vscode from 'vscode'
import { promises as fs, constants, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'
import type { PdfPayload } from '@merkzeug/core/pdf'
import { allowed, exists, getLocaleTag, minimalEdit, rootOf, slash, stem, t, withEol } from './files'
import { assignTemplate, imageInsertMode, imageSettings, loadTemplate, setVaultImageInsert, templateState } from './templates'
import { cleanPrintFiles, findBrowser, printFile, renderPdf } from './pdf'

type Message = { id: number; method: string; [key: string]: any }
const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'])
/** Session-wide state shared by all editors, like the IntelliJ application services. */
const guidanceDismissed = new Set<string>()
const releaseClaims = new Set<string>()

/** A VS Code TextDocument edited through the shared Merkzeug web shell. */
export class EditorSession implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = []
  private applying = 0
  private lastWritten: string | undefined
  private exporting = false
  readonly root: string
  /** Handled bridge methods, in order; the native smoke test observes the web shell through it. */
  readonly handled: string[] = []

  constructor(readonly document: vscode.TextDocument, readonly panel: vscode.WebviewPanel, private readonly context: vscode.ExtensionContext) {
    this.root = rootOf(document.uri)
    const web = vscode.Uri.joinPath(context.extensionUri, 'web')
    panel.webview.options = { enableScripts: true, localResourceRoots: [web, vscode.Uri.file(this.root)] }
    panel.webview.html = this.html(web)
    this.disposables.push(
      panel.webview.onDidReceiveMessage((json: string) => void this.dispatch(json)),
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document !== document || event.contentChanges.length === 0) return
        if (this.applying > 0 && document.getText() === this.lastWritten) return
        this.post({ type: 'changed' })
      })
    )
  }

  post(message: unknown) { void this.panel.webview.postMessage(message) }
  dispose() { for (const disposable of this.disposables.splice(0)) disposable.dispose() }

  private html(web: vscode.Uri): string {
    const webview = this.panel.webview
    const source = webview.cspSource
    const csp = `default-src 'none'; script-src ${source}; style-src ${source} 'unsafe-inline'; img-src ${source} data: https: http:; font-src ${source} data:; media-src ${source}; connect-src ${source}; object-src 'none'`
    const resources = webview.asWebviewUri(vscode.Uri.file('/')).toString().replace(/\/$/, '')
    const index = readFileSync(vscode.Uri.joinPath(web, 'index.html').fsPath, 'utf8')
    return index.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}"><base href="${webview.asWebviewUri(web)}/"><meta name="merkzeug-resources" content="${resources}">`)
  }

  private async dispatch(json: string) {
    let message: Message
    try { message = JSON.parse(json) } catch { return }
    try {
      const value = await this.handle(message)
      void this.panel.webview.postMessage({ type: 'reply', id: message.id, value: value ?? null })
    } catch (error) {
      void this.panel.webview.postMessage({ type: 'reply', id: message.id, value: null, error: error instanceof Error ? error.message : String(error) })
    }
  }

  private get state() { return this.context.globalState }
  private get file() { return this.document.uri.fsPath }

  async handle(m: Message): Promise<unknown> {
    this.handled.push(m.method)
    switch (m.method) {
      case 'init': return {
        path: slash(this.file), vault: slash(this.root), readonly: await this.readonly(), locale: getLocaleTag(),
        themeChoice: 'system', tourSeen: this.state.get('merkzeug.tour.seen', false)
      }
      case 'tourSeen': await this.state.update('merkzeug.tour.seen', true); return true
      case 'settings': await vscode.commands.executeCommand('merkzeug.pdfTemplateSettings', this.document.uri); return true
      case 'guidanceSuppressed': return guidanceDismissed.has(this.root) || this.state.get('merkzeug.guidance.' + this.root, false)
      case 'guidanceSuppress':
        guidanceDismissed.add(this.root)
        if (m.never) await this.state.update('merkzeug.guidance.' + this.root, true)
        return true
      case 'guidanceRead': return this.guidanceRead(String(m.name))
      case 'guidanceAppend': await this.guidanceAppend(String(m.name), m.expected ?? null, String(m.addition)); return true
      case 'read': return this.read(String(m.path))
      case 'exists': return fs.stat(await allowed(this.root, String(m.path))).then(s => s.isFile(), () => false)
      case 'write': return this.write(String(m.path), String(m.text), String(m.revision))
      case 'save': await this.document.save(); return true
      case 'undo': case 'redo':
        // The TextDocument owns history; VS Code routes undo/redo of the active custom text editor to it.
        if (!this.panel.active) this.panel.reveal()
        await vscode.commands.executeCommand(m.method)
        return true
      case 'open': await this.open(String(m.href)); return true
      case 'image': return this.saveImage(String(m.base64), String(m.extension))
      case 'templatePreview': {
        const config = vscode.workspace.getConfiguration('merkzeug', this.document.uri)
        if (typeof m.enabled === 'boolean') await config.update('editor.pdfTemplatePreview', m.enabled, vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global)
        return vscode.workspace.getConfiguration('merkzeug', this.document.uri).get('editor.pdfTemplatePreview', false)
      }
      case 'template': return loadTemplate(this.root, this.document.uri)
      case 'imageInsertMode': return imageInsertMode(this.root)
      case 'imageSettings': {
        if (typeof m.appHtml === 'boolean') await vscode.workspace.getConfiguration('merkzeug').update('editor.insertImagesAsHtml', m.appHtml, vscode.ConfigurationTarget.Global)
        if (m.vault === 'html' || m.vault === 'markdown' || m.vault === '') await setVaultImageInsert(this.root, m.vault || null)
        return imageSettings(this.root)
      }
      case 'releaseClaim': {
        const version = String(m.version)
        if (this.state.get('merkzeug.releaseNotesSeen') === version || releaseClaims.has(version)) return false
        releaseClaims.add(version); return true
      }
      case 'releaseSeen': await this.state.update('merkzeug.releaseNotesSeen', String(m.version)); return true
      case 'templateState': return templateState(this.root, this.document.uri)
      case 'templateAssign': await assignTemplate(this.root, this.document.uri, String(m.name ?? '')); return templateState(this.root, this.document.uri)
      case 'exportScope': return this.chooseExportScope(m.paths as string[])
      case 'export': return this.exportPdf(m.payload as PdfPayload, !!m.print)
      default: throw new Error(t('Unknown action'))
    }
  }

  private async readonly(): Promise<boolean> {
    if (vscode.workspace.fs.isWritableFileSystem(this.document.uri.scheme) === false) return true
    return fs.access(this.file, constants.W_OK).then(() => false, () => true)
  }

  private async read(value: string): Promise<{ text: string; revision: string }> {
    const resolved = await allowed(this.root, value)
    if (resolved === await fs.realpath(this.file)) return { text: this.document.getText(), revision: String(this.document.version) }
    const open = vscode.workspace.textDocuments.find(d => d.uri.scheme === 'file' && path.resolve(d.uri.fsPath) === resolved)
    if (open) return { text: open.getText(), revision: String(open.version) }
    return { text: await fs.readFile(resolved, 'utf8'), revision: String((await fs.stat(resolved)).mtimeMs) }
  }

  private async write(value: string, markdown: string, revision: string): Promise<{ revision: string }> {
    if (await allowed(this.root, value) !== await fs.realpath(this.file)) throw new Error(t('Wrong document'))
    if (String(this.document.version) !== revision) throw new Error(t('CONFLICT: The document has changed since it was read.'))
    if (await this.readonly()) throw new Error(t('File is read-only'))
    const text = withEol(this.document, markdown)
    const change = minimalEdit(this.document, text)
    if (change) {
      const edit = new vscode.WorkspaceEdit()
      edit.replace(this.document.uri, change.range, change.text)
      this.applying++
      this.lastWritten = text
      try { if (!await vscode.workspace.applyEdit(edit)) throw new Error(t('File is read-only')) }
      finally { this.applying--; this.lastWritten = undefined }
    }
    return { revision: String(this.document.version) }
  }

  private async open(href: string) {
    if (/^(https?:\/\/|mailto:)/i.test(href)) { await vscode.env.openExternal(vscode.Uri.parse(href, true)); return }
    const link = decodeURIComponent(href.split(/[#?]/, 1)[0])
    let target = link.startsWith('/') ? path.join(this.root, link.slice(1)) : path.join(path.dirname(this.file), link)
    if (!await exists(target) && !/\.md$/i.test(link)) target += '.md'
    const uri = vscode.Uri.file(await allowed(this.root, target))
    // Markdown links stay in Merkzeug; VS Code activates an already open tab.
    if (/\.md$/i.test(target)) await vscode.commands.executeCommand('vscode.openWith', uri, 'merkzeug.editor')
    else await vscode.commands.executeCommand('vscode.open', uri)
  }

  private async saveImage(base64: string, extension: string): Promise<string> {
    const type = extension.toLowerCase()
    if (!IMAGE_TYPES.has(type)) throw new Error(t('Unsupported image format'))
    const note = await allowed(this.root, this.file)
    const folder = stem(path.basename(this.file)) + '.assets'
    const directory = path.join(path.dirname(note), folder)
    if (await exists(directory)) await allowed(this.root, directory)
    await fs.mkdir(directory, { recursive: true })
    const name = `image-${randomUUID()}.${type}`
    await fs.writeFile(path.join(directory, name), Buffer.from(base64, 'base64'), { flag: 'wx' })
    return folder + '/' + name
  }

  private async guidancePath(name: string): Promise<string> {
    if (name !== 'AGENTS.md' && name !== 'CLAUDE.md') throw new Error('Invalid instruction file')
    const file = path.join(this.root, name)
    if ((await fs.lstat(file).catch(() => undefined))?.isSymbolicLink()) throw new Error('Review symbolic links manually')
    return file
  }
  private async guidanceRead(name: string): Promise<string | null> {
    const file = await this.guidancePath(name)
    if (!await exists(file)) return null
    return (await this.read(file)).text
  }
  private async guidanceAppend(name: string, expected: string | null, addition: string) {
    const file = await this.guidancePath(name)
    if (await this.guidanceRead(name) !== expected) throw new Error('Instructions changed externally. Review the refreshed preview.')
    if (expected === null) { await fs.writeFile(file, addition, { flag: 'wx' }); return }
    const target = await vscode.workspace.openTextDocument(vscode.Uri.file(file))
    if (target.getText() !== expected) throw new Error('Instructions changed externally.')
    const edit = new vscode.WorkspaceEdit()
    edit.insert(target.uri, target.positionAt(target.getText().length), addition)
    if (!await vscode.workspace.applyEdit(edit)) throw new Error(t('File is read-only'))
    await target.save()
  }

  private async chooseExportScope(paths: string[]): Promise<number> {
    const names = await Promise.all(paths.map(async item => slash(path.relative(await fs.realpath(this.root), await allowed(this.root, item)))))
    const only = t('Only this document'), linked = t('Include linked documents')
    const choice = await vscode.window.showInformationMessage(t('Choose which documents to include in the PDF.'),
      { modal: true, detail: t('Linked documents:') + '\n' + names.join('\n') }, only, linked)
    return choice === only ? 0 : choice === linked ? 1 : 2
  }

  requestPrint(print: boolean) { this.post({ type: print ? 'print' : 'export' }) }

  private async exportPdf(payload: PdfPayload, print: boolean): Promise<boolean> {
    if (this.exporting) throw new Error(t('A PDF export is already running'))
    this.exporting = true
    try {
      const browser = await findBrowser(vscode.workspace.getConfiguration('merkzeug').get<string>('pdf.browserPath', ''))
      if (!browser) {
        const settings = t('Open Settings')
        void vscode.window.showErrorMessage(t('PDF export needs Google Chrome, Microsoft Edge, Chromium or Brave. Install one or set its path in the Merkzeug settings.'), settings)
          .then(choice => { if (choice === settings) void vscode.commands.executeCommand('workbench.action.openSettings', 'merkzeug.pdf.browserPath') })
        return false
      }
      // Test runs supply the destination, as MERKZEUG_PDF_TARGET does for the desktop app.
      const automated = print ? undefined : process.env.MERKZEUG_PDF_TARGET
      let target: string
      if (print) { await cleanPrintFiles(); target = printFile() }
      else if (automated) target = automated
      else {
        const chosen = await vscode.window.showSaveDialog({
          title: t('Merkzeug: Export PDF'), filters: { PDF: ['pdf'] },
          defaultUri: vscode.Uri.file(path.join(path.dirname(this.file), stem(path.basename(this.file)) + '.pdf'))
        })
        if (!chosen) return false
        target = /\.pdf$/i.test(chosen.fsPath) ? chosen.fsPath : chosen.fsPath + '.pdf'
      }
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: print ? t('Preparing print …') : t('Exporting …') },
        () => renderPdf({ browser, webDir: vscode.Uri.joinPath(this.context.extensionUri, 'web').fsPath, root: this.root, locale: getLocaleTag(), payload, target }))
      if (print) await vscode.env.openExternal(vscode.Uri.file(target))
      else if (!automated) {
        const openPdf = t('Open PDF'), reveal = t('Reveal in File Explorer')
        void vscode.window.showInformationMessage(t('PDF saved: ') + target, openPdf, reveal).then(choice => {
          if (choice === openPdf) void vscode.env.openExternal(vscode.Uri.file(target))
          if (choice === reveal) void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(target))
        })
      }
      return true
    } finally { this.exporting = false }
  }
}

export class MerkzeugEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'merkzeug.editor'
  readonly sessions = new Set<EditorSession>()
  constructor(private readonly context: vscode.ExtensionContext) {}
  resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): void {
    const session = new EditorSession(document, panel, this.context)
    this.sessions.add(session)
    panel.onDidDispose(() => { session.dispose(); this.sessions.delete(session) })
  }
  active(): EditorSession | undefined { return [...this.sessions].find(session => session.panel.active) }
  broadcast(message: unknown) { for (const session of this.sessions) session.post(message) }
}

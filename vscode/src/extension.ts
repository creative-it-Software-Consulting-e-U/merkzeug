import * as vscode from 'vscode'
import * as path from 'node:path'
import { supportUrl } from '@merkzeug/core/support'
import { initializeLocale, t } from './files'
import { MerkzeugEditorProvider } from './editor'
import { registerRefactoring } from './refactor'
import { cleanPrintFiles } from './pdf'
import { configuredFolder, discoverDesktopTemplates, installStarter, setConfiguredFolder, stylingPrompt } from './templates'

function markdownUri(value: unknown): vscode.Uri | undefined {
  if (value instanceof vscode.Uri) return value
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab?.input
  if (tab instanceof vscode.TabInputText || tab instanceof vscode.TabInputCustom) return tab.uri
  return vscode.window.activeTextEditor?.document.uri
}

export function activate(context: vscode.ExtensionContext) {
  initializeLocale()
  const provider = new MerkzeugEditorProvider(context)
  const command = (id: string, run: (...args: any[]) => unknown) => context.subscriptions.push(vscode.commands.registerCommand(id, async (...args: any[]) => {
    try { await run(...args) } catch (error) { void vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error)) }
  }))

  context.subscriptions.push(vscode.window.registerCustomEditorProvider(MerkzeugEditorProvider.viewType, provider, {
    webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true
  }))
  registerRefactoring(context)
  void cleanPrintFiles()

  command('merkzeug.openEditor', (uri?: vscode.Uri) => {
    const target = markdownUri(uri)
    if (target) return vscode.commands.executeCommand('vscode.openWith', target, MerkzeugEditorProvider.viewType)
  })
  command('merkzeug.openSource', (uri?: vscode.Uri) => {
    const target = markdownUri(uri)
    if (target) return vscode.commands.executeCommand('vscode.openWith', target, 'default')
  })
  command('merkzeug.exportPdf', () => provider.active()?.requestPrint(false))
  command('merkzeug.print', () => provider.active()?.requestPrint(true))

  const scope = (uri?: unknown) => markdownUri(uri) ?? vscode.workspace.workspaceFolders?.[0]?.uri
  const chooseFolder = async (uri?: vscode.Uri) => {
    const current = configuredFolder(uri)
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true, canSelectFiles: false, canSelectMany: false, title: t('Merkzeug: PDF template folder'),
      defaultUri: current ? vscode.Uri.file(current) : undefined
    })
    if (picked?.[0]) await setConfiguredFolder(picked[0].fsPath, uri)
  }
  const useBundled = async (uri?: vscode.Uri) => setConfiguredFolder(await installStarter(context), uri)
  const chooseDesktop = async (uri?: vscode.Uri) => {
    const found = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: t('Looking for desktop templates…') }, () => discoverDesktopTemplates())
    const status = t(found.unreadable ? 'Some desktop locations could not be read. You can choose a folder manually.'
      : found.templates.length === 0 ? 'No desktop templates found. You can choose a folder manually.'
      : 'Select a template to use its existing folder. No files are copied.')
    if (found.templates.length === 0) {
      const choose = t('Choose folder…')
      if (await vscode.window.showInformationMessage(status, choose) === choose) await chooseFolder(uri)
      return
    }
    const picked = await vscode.window.showQuickPick(found.templates.map(template => ({ label: template.name, detail: template.directory, template })), { title: t('Desktop templates'), placeHolder: status })
    if (picked) await setConfiguredFolder(picked.template.directory, uri)
  }
  const showStylingPrompt = async (uri?: vscode.Uri) => {
    const text = await stylingPrompt(context, configuredFolder(uri))
    const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: text })
    await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside })
    const copy = t('Copy styling prompt')
    if (await vscode.window.showInformationMessage(t('Template styling prompt'), copy) === copy) await vscode.env.clipboard.writeText(text)
  }
  command('merkzeug.chooseTemplateFolder', (uri?: unknown) => chooseFolder(scope(uri)))
  command('merkzeug.useBundledTemplate', (uri?: unknown) => useBundled(scope(uri)))
  command('merkzeug.chooseDesktopTemplate', (uri?: unknown) => chooseDesktop(scope(uri)))
  command('merkzeug.templateStylingPrompt', (uri?: unknown) => showStylingPrompt(scope(uri)))
  command('merkzeug.pdfTemplateSettings', async (value?: unknown) => {
    const uri = scope(value)
    const current = configuredFolder(uri)
    const actions = [
      { label: '$(folder-opened) ' + t('Choose PDF template folder…'), run: () => chooseFolder(uri) },
      { label: '$(package) ' + t('Use bundled PDF template'), run: () => useBundled(uri) },
      { label: '$(desktop-download) ' + t('Desktop templates'), run: () => chooseDesktop(uri) },
      { label: '$(copy) ' + t('Template styling prompt'), run: () => showStylingPrompt(uri) },
      ...(current ? [{ label: '$(close) ' + t('No template'), run: () => setConfiguredFolder('', uri) }] : []),
      { label: '$(settings-gear) ' + t('Open Settings'), run: () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:' + context.extension.id) }
    ]
    const picked = await vscode.window.showQuickPick(actions, {
      title: t('PDF template folder (empty: no template)'), placeHolder: current ? path.basename(current) + ' — ' + current : t('No template')
    })
    await picked?.run()
  })
  command('merkzeug.contactSupport', () => vscode.env.openExternal(vscode.Uri.parse(supportUrl(initializeLocale(), 'VS Code', context.extension.packageJSON.version), true)))

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('merkzeug')) provider.broadcast({ type: 'settings' })
  }), vscode.workspace.onDidGrantWorkspaceTrust(() => provider.broadcast({ type: 'settings' })))
  return { provider }
}

export function deactivate() {}

import * as vscode from 'vscode'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { normalizeLinkPath, rewriteMarkdownLinks, type PathMove } from '@merkzeug/core/linkRefactoring'
import { minimalEdit, rootOf, slash, stem, t } from './files'

const linkPath = (fsPath: string) => normalizeLinkPath(slash(fsPath))
const key = (uri: vscode.Uri) => path.resolve(uri.fsPath)

/** Honors files.exclude and search.exclude, like IntelliJ's indexed project content. */
function excludes(): string {
  const patterns = new Set<string>(['**/node_modules/**'])
  for (const section of ['files.exclude', 'search.exclude']) {
    const values = vscode.workspace.getConfiguration().get<Record<string, unknown>>(section) ?? {}
    for (const [pattern, enabled] of Object.entries(values)) if (enabled === true) patterns.add(pattern)
  }
  return `{${[...patterns].join(',')}}`
}

/**
 * VS Code's rename/move participant (Explorer rename, drag and drop, and API renames).
 * A note's sibling `Note.assets/` joins the same undoable operation, and local Markdown
 * links throughout the workspace are recalculated with the shared link rewriter.
 */
export function registerRefactoring(context: vscode.ExtensionContext): void {
  const own = new Set<string>()
  context.subscriptions.push(vscode.workspace.onWillRenameFiles(event => {
    const files = event.files.filter(file => {
      if (own.delete(key(file.oldUri))) return false
      return file.oldUri.scheme === 'file' && file.newUri.scheme === 'file'
        && vscode.workspace.getConfiguration('merkzeug', file.oldUri).get<boolean>('refactoring.companionFolders', true)
    })
    if (files.length) event.waitUntil(planRename(files, own))
  }))
}

export async function planRename(files: readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[], own = new Set<string>()): Promise<vscode.WorkspaceEdit> {
  const edit = new vscode.WorkspaceEdit()
  const moves: PathMove[] = []
  const companions: [vscode.Uri, vscode.Uri][] = []
  const moving = new Set(files.map(file => key(file.oldUri)))
  const warnings: string[] = []
  for (const { oldUri, newUri } of files) {
    moves.push({ from: linkPath(oldUri.fsPath), to: linkPath(newUri.fsPath) })
    const source = await fs.lstat(oldUri.fsPath).catch(() => undefined)
    if (!source?.isFile() || !/\.md$/i.test(oldUri.fsPath)) continue
    const companion = path.join(path.dirname(oldUri.fsPath), stem(path.basename(oldUri.fsPath)) + '.assets')
    const target = path.join(path.dirname(newUri.fsPath), stem(path.basename(newUri.fsPath)) + '.assets')
    const folder = await fs.lstat(companion).catch(() => undefined)
    // Selecting the note and its folder together must not move the folder twice.
    if (!folder || moving.has(path.resolve(companion)) || path.resolve(companion) === path.resolve(target)) continue
    if (folder.isSymbolicLink()) { warnings.push(t('Refactoring symbolic-link attachments requires manual review.')); continue }
    if (!folder.isDirectory()) continue
    const collision = await fs.lstat(target).then(() => true, () => false)
    const caseOnly = collision && path.resolve(companion).toLowerCase() === path.resolve(target).toLowerCase()
    if (collision && !caseOnly) { warnings.push(t('Attachment refactoring stopped: destination already exists: ') + path.basename(target)); continue }
    moves.push({ from: linkPath(companion), to: linkPath(target) })
    companions.push([vscode.Uri.file(companion), vscode.Uri.file(target)])
  }
  for (const warning of warnings) void vscode.window.showWarningMessage(warning)
  for (const uri of await vscode.workspace.findFiles('**/*.md', excludes())) {
    if (uri.scheme !== 'file' || (await fs.lstat(uri.fsPath).catch(() => undefined))?.isSymbolicLink()) continue
    const open = vscode.workspace.textDocuments.find(document => document.uri.toString() === uri.toString())
    const before = open ? open.getText() : await fs.readFile(uri.fsPath, 'utf8').catch(() => undefined)
    if (before === undefined) continue
    const after = rewriteMarkdownLinks(before, linkPath(uri.fsPath), moves, linkPath(rootOf(uri)))
    if (after === before) continue
    const document = open ?? await vscode.workspace.openTextDocument(uri)
    const change = minimalEdit(document, after)
    if (change) edit.replace(uri, change.range, change.text, { label: t('Update Markdown links'), needsConfirmation: false })
  }
  for (const [from, to] of companions) {
    // Our own folder rename may re-enter this participant; forget it if it does not.
    own.add(key(from)); setTimeout(() => own.delete(key(from)), 10_000)
    edit.renameFile(from, to, { overwrite: false })
  }
  return edit
}

import { effectiveImageInsert, vaultImageInsert, withVaultImageInsert, type ImageInsertMode } from '@merkzeug/core/imageInsert'
import * as vscode from 'vscode'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { PdfTemplate } from '@merkzeug/core/pdf'
import { storedTemplateSelection, templateSelection, validateTemplateSelection } from '@merkzeug/core/templateSelection'
import { exists, isInside, mime, t } from './files'

const TEMPLATE_FILES = ['kopfzeile.html', 'fusszeile.html', 'deckblatt.html', 'stil.css', 'vorlage.json']
const STARTER_FILES = [...TEMPLATE_FILES, 'README.md', 'AGENTS.md', 'STYLING-PROMPT.md']

/** The folder selected in VS Code settings; Restricted Mode ignores workspace values. */
export function configuredFolder(scope?: vscode.Uri): string {
  const setting = vscode.workspace.getConfiguration('merkzeug', scope).inspect<string>('pdf.templateFolder')
  const value = vscode.workspace.isTrusted
    ? vscode.workspace.getConfiguration('merkzeug', scope).get<string>('pdf.templateFolder', '')
    : setting?.globalValue ?? ''
  return value.trim()
}
export async function setConfiguredFolder(value: string, scope?: vscode.Uri): Promise<void> {
  if (value && !(await fs.stat(value).then(s => s.isDirectory(), () => false))) throw new Error(t('Choose an existing template folder'))
  const target = vscode.workspace.workspaceFolders?.length ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global
  await vscode.workspace.getConfiguration('merkzeug', scope).update('pdf.templateFolder', value || undefined, target)
}

export interface DesktopTemplate { name: string; directory: string }
/** Read-only discovery of the Electron app's template locations, like the IntelliJ plugin. */
export async function discoverDesktopTemplates(platform = process.platform, home = os.homedir(), env = process.env): Promise<{ templates: DesktopTemplate[]; unreadable: boolean }> {
  const base = platform === 'darwin' ? path.join(home, 'Library/Application Support')
    : platform === 'win32' ? env.APPDATA ?? path.join(home, 'AppData/Roaming')
    : env.XDG_CONFIG_HOME ?? path.join(home, '.config')
  const roots = new Set<string>()
  let unreadable = false
  if (env.MERKZEUG_TEMPLATES_ROOT?.trim()) roots.add(env.MERKZEUG_TEMPLATES_ROOT)
  for (const profile of [path.join(base, 'merkzeug'), path.join(base, 'Merkzeug')]) {
    let root = path.join(profile, 'PDF-Vorlagen')
    const settings = path.join(profile, 'settings.json')
    if (await exists(settings)) {
      try {
        const configured = JSON.parse(await fs.readFile(settings, 'utf8')).templatesRoot
        if (typeof configured === 'string' && configured.trim()) root = configured
      } catch { unreadable = true }
    }
    roots.add(root)
  }
  const found = new Map<string, DesktopTemplate>()
  for (const root of roots) {
    if (!await exists(root)) continue
    try {
      for (const entry of await fs.readdir(root, { withFileTypes: true })) {
        const directory = path.join(root, entry.name)
        if (entry.name.startsWith('.') || !(await fs.stat(directory).then(s => s.isDirectory(), () => false))) continue
        const files = await Promise.all(TEMPLATE_FILES.map(name => fs.stat(path.join(directory, name)).then(s => s.isFile(), () => false)))
        if (files.some(Boolean)) { const real = await fs.realpath(directory); found.set(real, { name: path.basename(real), directory: real }) }
      }
    } catch { unreadable = true }
  }
  return { templates: [...found.values()].sort((a, b) => a.directory.localeCompare(b.directory, undefined, { sensitivity: 'base' })), unreadable }
}

async function settingsFile(root: string): Promise<string> {
  const directory = path.join(root, '.merkzeug')
  if (await exists(directory) && !await isInside(root, directory)) throw new Error('Vault settings are outside the vault')
  return path.join(directory, 'settings.json')
}
async function readVault(root: string): Promise<Record<string, unknown>> {
  const file = await settingsFile(root)
  if (!await exists(file)) return {}
  if (!await isInside(root, file)) throw new Error('Vault settings are outside the vault')
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

async function central(scope: vscode.Uri): Promise<string[]> {
  const explicit = configuredFolder(scope)
  return [...(explicit ? [explicit] : []), ...(await discoverDesktopTemplates()).templates.map(t => t.directory)]
}
/** `.merkzeug/settings.json` wins; without an assignment the configured folder applies. */
export async function selection(root: string, scope: vscode.Uri): Promise<string | null> {
  const config = await readVault(root)
  if (!('pdfTemplate' in config)) {
    const explicit = configuredFolder(scope)
    return explicit ? path.basename(explicit) : null
  }
  const value = config.pdfTemplate
  if (value === null) return null
  if (typeof value === 'object' && (value as { source?: unknown }).source !== 'vault') throw new Error('Invalid template location')
  return templateSelection(value)
}
export async function resolveTemplate(root: string, scope: vscode.Uri, selected: string | null): Promise<string | null> {
  if (!selected) return null
  validateTemplateSelection(selected)
  if (selected.startsWith('vault:')) {
    const directory = path.join(root, selected.slice(6))
    if (!await isInside(root, directory) || !(await fs.stat(directory).then(s => s.isDirectory(), () => false))) throw new Error('Template is outside the vault')
    return fs.realpath(directory)
  }
  for (const directory of await central(scope)) {
    if (path.basename(directory) === selected && await fs.stat(directory).then(s => s.isDirectory(), () => false)) return fs.realpath(directory)
  }
  throw new Error('Template folder is missing: ' + selected)
}
export async function templateState(root: string, scope: vscode.Uri) {
  return { assigned: await selection(root, scope), templates: [...new Set((await central(scope)).map(p => path.basename(p)))] }
}
/** App setting (VS Code configuration) and the vault's own choice for newly inserted images. */
export async function imageSettings(root: string) {
  const appHtml = vscode.workspace.getConfiguration('merkzeug').get('editor.insertImagesAsHtml', false)
  let vault: ImageInsertMode | null = null
  try { vault = vaultImageInsert(await readVault(root)) } catch { /* unreadable settings follow the app setting */ }
  return { appHtml, vault }
}
export async function imageInsertMode(root: string): Promise<ImageInsertMode> {
  const { appHtml, vault } = await imageSettings(root)
  return effectiveImageInsert(appHtml, vault)
}
let assigning = Promise.resolve()
export function setVaultImageInsert(root: string, mode: ImageInsertMode | null): Promise<void> {
  const run = assigning.then(async () => {
    const config = await readVault(root)
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid vault settings')
    const target = await settingsFile(root)
    const open = vscode.workspace.textDocuments.find(d => d.uri.scheme === 'file' && path.resolve(d.uri.fsPath) === path.resolve(target))
    if (open?.isDirty) throw new Error('Save vault settings before changing the image setting')
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, JSON.stringify(withVaultImageInsert(config, mode), null, 2) + '\n')
  })
  assigning = run.catch(() => {})
  return run
}
export function assignTemplate(root: string, scope: vscode.Uri, selected: string): Promise<void> {
  const run = assigning.then(async () => {
    await resolveTemplate(root, scope, selected || null)
    const config = await readVault(root)
    config.pdfTemplate = selected ? storedTemplateSelection(selected) : null
    const target = await settingsFile(root)
    const open = vscode.workspace.textDocuments.find(d => d.uri.scheme === 'file' && path.resolve(d.uri.fsPath) === path.resolve(target))
    if (open?.isDirty) throw new Error('Save vault settings before changing the template')
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, JSON.stringify(config, null, 2) + '\n')
  })
  assigning = run.catch(() => {})
  return run
}

/** Template parts with images inlined as data URIs, confined to the template folder. */
export async function loadTemplate(root: string, scope: vscode.Uri): Promise<PdfTemplate | null> {
  const directory = await resolveTemplate(root, scope, await selection(root, scope))
  if (!directory) return null
  const result: PdfTemplate = { name: path.basename(directory) }
  const inlineImages = async (html: string) => {
    let output = ''
    let last = 0
    for (const match of html.matchAll(/(src=["']|url\(["']?)([^"')]+)/gi)) {
      const ref = match[2].trim()
      if (/^(data:|https?:)/i.test(ref)) continue
      const image = await fs.realpath(path.resolve(directory, decodeURIComponent(ref)))
      if (!await isInside(directory, image)) throw new Error(t('Template image is outside the template folder'))
      const type = mime(image)
      if (!type.startsWith('image/')) throw new Error(t('Template resource is not an image'))
      output += html.slice(last, match.index) + match[1] + `data:${type};base64,` + (await fs.readFile(image)).toString('base64')
      last = match.index + match[0].length
    }
    return output + html.slice(last)
  }
  for (const [key, name] of [['header', 'kopfzeile.html'], ['footer', 'fusszeile.html'], ['cover', 'deckblatt.html'], ['css', 'stil.css']] as const) {
    const file = path.join(directory, name)
    if (!await exists(file)) continue
    if (!await isInside(directory, file)) throw new Error(t('Template file is outside the template folder'))
    result[key] = await inlineImages(await fs.readFile(file, 'utf8'))
  }
  const margins = { top: 24, bottom: 18, left: 10, right: 10 }
  const config = path.join(directory, 'vorlage.json')
  const hasConfig = await exists(config)
  if (hasConfig) {
    if (!await isInside(directory, config)) throw new Error('Template configuration is outside the template folder')
    const values = JSON.parse(await fs.readFile(config, 'utf8')).margins ?? {}
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const value = values[side]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) margins[side] = value
    }
  }
  if (hasConfig || result.header || result.footer) result.margins = margins
  return result
}

/** Copies the bundled starter once into VS Code's global storage; never overwrites edits. */
export async function installStarter(context: vscode.ExtensionContext): Promise<string> {
  const source = vscode.Uri.joinPath(context.extensionUri, 'resources', 'pdf-templates', 'Merkzeug').fsPath
  const directory = path.join(context.globalStorageUri.fsPath, 'pdf-templates', 'Merkzeug')
  await fs.mkdir(directory, { recursive: true })
  for (const name of STARTER_FILES) {
    const target = path.join(directory, name)
    if (await exists(target)) continue
    try { await fs.copyFile(path.join(source, name), target) } catch { throw new Error(t('Bundled PDF template is missing')) }
  }
  return directory
}

export async function stylingPrompt(context: vscode.ExtensionContext, folder: string): Promise<string> {
  const base = vscode.Uri.joinPath(context.extensionUri, 'resources', 'pdf-templates', 'Merkzeug').fsPath
  const [prompt, guide] = await Promise.all(['STYLING-PROMPT.md', 'AGENTS.md'].map(name => fs.readFile(path.join(base, name), 'utf8')))
    .catch(() => { throw new Error('Template styling instructions are missing') })
  return prompt.replaceAll('{{TEMPLATE_PATH}}', folder || '[TEMPLATE FOLDER PATH ON THE AGENT’S COMPUTER]') + '\n' + guide
}

import { templateSelection, storedTemplateSelection, validateTemplateSelection } from '@merkzeug/core/templateSelection'
import { t } from '@merkzeug/core/i18n'
import { loadTemplateFiles } from '@merkzeug/core/templateLoader'
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PdfTemplate } from '@merkzeug/core/pdf'
import { vault } from './vault'

export interface TemplateFolder { cloud?: boolean; name?: string; templates: string[] }
const native = registerPlugin<{
  useCloudTemplateFolder(): Promise<TemplateFolder>
  templateFolder(): Promise<TemplateFolder>
  pickTemplateFolder(): Promise<TemplateFolder>
  templateFile(options: { name: string; path: string }): Promise<{ data?: string }>
}>('Vault')

export const templateFolder = () => Capacitor.isNativePlatform() ? native.templateFolder() : Promise.resolve({ name: 'Demo templates', templates: [] })
export const useCloudTemplateFolder = () => native.useCloudTemplateFolder()
export const pickTemplateFolder = () => Capacitor.isNativePlatform() ? native.pickTemplateFolder() : templateFolder()
const settingsPath = '/.merkzeug/settings.json'
export async function assignedTemplate(): Promise<string | null> {
  if (!await vault.exists(settingsPath)) return null
  const settings = JSON.parse((await vault.readFile(settingsPath)).content)
  return templateSelection(settings.pdfTemplate)
}
export async function assignTemplate(name: string | null): Promise<void> {
  if (name) await loadTemplate(name)
  const current = await vault.exists(settingsPath) ? await vault.readFile(settingsPath) : null
  const settings = current ? JSON.parse(current.content) : {}
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error(t('Invalid vault settings.'))
  if (name) settings.pdfTemplate = storedTemplateSelection(name)
  else settings.pdfTemplate = null
  if (!await vault.exists('/.merkzeug')) await vault.createFolder('/.merkzeug')
  await vault.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', current?.mtime ?? 0)
}
export const loadTemplate = async (name: string): Promise<PdfTemplate> => {
  validateTemplateSelection(name)
  if (!name.startsWith('vault:')) return loadTemplateFiles(name, async path => (await native.templateFile({ name, path })).data)
  const folder = '/' + name.slice(6)
  if (!(await vault.stat(folder)).isDirectory) throw new Error(t('Template folder is missing.'))
  return loadTemplateFiles(name, async path => {
    const file = folder + '/' + path
    return await vault.exists(file) ? vault.readFileBase64(file) : undefined
  })
}

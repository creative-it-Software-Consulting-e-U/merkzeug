import { forwardRef } from 'react'
import { vaultFileUrl } from '@merkzeug/core/vaultFileUrl'
import { Editor as SharedEditor, type EditorProps, type EditorHandle } from '@merkzeug/editor'
import type { EditorHost } from '@merkzeug/editor/host'
export type { EditorHandle, FormatAction } from '@merkzeug/editor'
const host: EditorHost = {
  readFile: (path, options) => window.merkzeug.readFile(path, options),
  writeFile: (path, text) => window.merkzeug.writeFile(path, text),
  writeFileSync: (path, text) => window.merkzeug.writeFileSync(path, text),
  saveImage: (path, data, ext) => window.merkzeug.saveImage(path, data, ext),
  onVaultChanged: (listener) => window.merkzeug.onVaultChanged(listener),
  openMermaidZoom: (svg) => window.merkzeug.openMermaidZoom(svg),
  resolveImage: vaultFileUrl
}
export const Editor = forwardRef<EditorHandle, Omit<EditorProps, 'host'>>((props, ref) =>
  <SharedEditor {...props} host={host} ref={ref} />)

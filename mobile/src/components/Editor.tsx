import { t as translate } from '@merkzeug/core/i18n'
import { useEffect, useMemo, useRef } from 'react'
import { Editor as SharedEditor, type EditorHandle, type EditorProps } from '@merkzeug/editor'
import type { EditorHost } from '@merkzeug/editor/host'
import { vault } from '../vault'
import { dirname, joinPath, normalizePath, extname } from '../util/paths'
import '@merkzeug/editor/editor.css'

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic' }
export function Editor(props: Omit<EditorProps, 'host'>) {
  const ref = useRef<EditorHandle>(null)
  useEffect(() => {
    const flush = (event: Event) => { (event as CustomEvent<Promise<void>[]>).detail.push(ref.current?.flush() ?? Promise.resolve()) }
    window.addEventListener('merkzeug-flush', flush)
    return () => window.removeEventListener('merkzeug-flush', flush)
  }, [])
  const latestPath = useRef(props.filePath)
  latestPath.current = props.filePath
  const host = useMemo<EditorHost>(() => {
    const versions = new Map<string, number>()
    const listeners = new Set<(vault: string, paths: string[]) => void>()
    const visible = () => {
      if (document.visibilityState === 'hidden') void ref.current?.flush().catch(error => alert(String(error)))
      else for (const listener of listeners) listener('/', [latestPath.current])
    }
    return {
      readFile: async (path, options) => { const result = await vault.readFile(path); if (!options?.peek) versions.set(path, result.mtime); return result.content },
      writeFile: async (path, text) => { versions.set(path, await vault.writeFile(path, text, versions.get(path))) },
      saveImage: (path, data, extension) => vault.saveImage(path, data, extension),
      resolveImage: async (path, url) => {
        if (!url || /^(https?:|data:)/i.test(url)) return url
        const decoded = decodeURI(url)
        const absolute = normalizePath(decoded.startsWith('/') ? decoded : joinPath(dirname(path), decoded))
        const data = await vault.readFileBase64(absolute)
        return `data:${MIME[extname(absolute).toLowerCase()] ?? 'application/octet-stream'};base64,${data}`
      },
      openMermaidZoom: async svg => {
        const dialog = document.createElement('dialog')
        dialog.style.cssText = 'max-width:95vw;max-height:90vh;overflow:auto'
        const close = document.createElement('button')
        close.textContent = translate("Close"); close.onclick = () => dialog.close()
        const content = document.createElement('div'); content.innerHTML = svg
        dialog.append(close, content); document.body.append(dialog)
        dialog.addEventListener('close', () => dialog.remove(), { once: true })
        dialog.showModal()
      },
      onSaveError: message => alert(translate("Could not save changes: ") + message),
      onVaultChanged: listener => {
        listeners.add(listener); document.addEventListener('visibilitychange', visible); window.addEventListener('merkzeug-external-change', visible)
        return () => { listeners.delete(listener); document.removeEventListener('visibilitychange', visible); window.removeEventListener('merkzeug-external-change', visible) }
      }
    }
  }, [])
  return <SharedEditor {...props} ref={ref} host={host} />
}

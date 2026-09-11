import { IconHeading, IconBold, IconItalic, IconStrike, IconInlineCode, IconBulletList, IconOrderedList, IconQuote, IconCodeBlock, IconHr, IconLink, IconImage, IconTable } from '@merkzeug/editor/icons'
import { GuidedTour } from '@merkzeug/editor/GuidedTour'
import { VaultGuidance, type GuidanceHost } from '@merkzeug/editor/VaultGuidance'
import { setHostTheme, setTheme } from '@merkzeug/editor/theme'
import { initializeTheme } from '@merkzeug/editor/theme'
import { t as translate, setLocale } from '@merkzeug/core/i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor, type EditorHandle, type FormatAction } from '@merkzeug/editor'
import type { EditorHost } from '@merkzeug/editor/host'
import { PdfView } from '@merkzeug/export'
import { collectLinkedDocs, fillTemplate, resolvePath } from '@merkzeug/core/exportPlan'
import type { PdfPayload, PdfTemplate } from '@merkzeug/core/pdf'
import { request } from './bridge'
import './style.css'

initializeTheme()

function imageUrl(path: string, url: string): string {
  if (!url || /^(https?:|data:)/i.test(url)) return url
  const decoded = decodeURI(url)
  const absolute = decoded.startsWith('/') ? decoded : resolvePath(path.slice(0, path.lastIndexOf('/')), decoded)
  return `${location.origin}/image?path=${encodeURIComponent(absolute)}`
}
const guidanceHost: GuidanceHost = { suppressed: () => request('guidanceSuppressed'), suppress: never => request('guidanceSuppress', { never }), read: name => request('guidanceRead', { name }), append: (name, expected, addition) => request('guidanceAppend', { name, expected, addition }) }
function App() {
  const [info, setInfo] = useState<{ path: string; vault: string; readonly: boolean; locale: string; tourSeen: boolean }>()
  const [status, setStatus] = useState(translate("Loading …"))
  const [error, setError] = useState('')
  const [extras, setExtras] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<EditorHandle>(null)
  const listeners = useRef(new Set<(vault: string, paths: string[]) => void>())
  const revision = useRef('')
  const queue = useRef(Promise.resolve())
  const host: EditorHost = useMemo(() => ({
    saveDelayMs: 0,
    readFile: async (path, options) => {
      const result = await request('read', { path })
      if (!options?.peek) revision.current = result.revision
      return result.text
    },
    writeFile: (path, text) => {
      const operation = queue.current.then(async () => {
        const result = await request('write', { path, text, revision: revision.current })
        revision.current = result.revision
      })
      queue.current = operation.catch(() => {})
      return operation
    },
    saveImage: (path, base64, extension) => request('image', { path, base64, extension }),
    resolveImage: imageUrl,
    openMermaidZoom: async (svg) => {
      const dialog = document.createElement('dialog')
      dialog.className = 'diagram-zoom'
      const close = document.createElement('button'); close.textContent = translate("Close"); close.onclick = () => dialog.close()
      const content = document.createElement('div'); content.innerHTML = svg
      dialog.append(close, content); document.body.append(dialog)
      dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal()
    },
    onVaultChanged: (listener) => { listeners.current.add(listener); return () => { listeners.current.delete(listener) } }
  }), [])
  useEffect(() => {
    window.__merkzeugTheme = theme => { setTheme('system'); setHostTheme(theme) }
    request('init').then(result => { setLocale(result.locale); setTheme('system'); setHostTheme(result.theme); setInfo(result); setStatus(translate('Synced with IntelliJ')) }).catch(e => setError(String(e)))
  }, [])
  useEffect(() => {
    window.__merkzeugChanged = () => { if (info) for (const listener of listeners.current) listener(info.vault, [info.path]) }
  }, [info])
  async function action(method: string) {
    try { await ref.current?.flush(); await queue.current; await request(method); setError('') }
    catch (e) { setError(String(e)) }
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' || key === 's') {
        event.preventDefault(); event.stopImmediatePropagation()
        void action(key === 's' ? 'save' : event.shiftKey ? 'redo' : 'undo')
      } else if (key === 'f') {
        event.preventDefault(); event.stopImmediatePropagation(); ref.current?.openSearch(event.altKey)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  })
  async function exportPdf() {
    if (!info || busy) return
    setBusy(true); setError('')
    try {
      await ref.current?.flush(); await queue.current
      const current = await request('read', { path: info.path })
      const linked = await collectLinkedDocs(info.path, current.text, info.vault, path => request('exists', { path }))
      const scope = linked.length > 0 ? await request<number>('exportScope', { paths: linked }) : 0
      if (scope !== 0 && scope !== 1) return
      const include = scope === 1
      const paths = include ? [info.path, ...linked] : [info.path]
      const docs = await Promise.all(paths.map(async path => ({ path, content: (await request('read', { path })).text })))
      const template = await request<PdfTemplate | null>('template')
      const payload: PdfPayload = {
        vault: info.vault, docs,
        template: template ? fillTemplate(template, current.text, info.path.split('/').pop()!.replace(/\.md$/i, ''), include) : null
      }
      await request('export', { payload })
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <div className="ide-app">
    <header className="format-toolbar" role="toolbar" aria-label={translate("Paragraph style")}>
      <details className="format-menu"><summary onMouseDown={e => e.preventDefault()} title={translate("Paragraph style")} aria-label={translate("Paragraph style")}><IconHeading /></summary><div>
        {(['text', 'h1', 'h2', 'h3'] as const).map((action, i) => <button key={action} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={e => { ref.current?.format(action); e.currentTarget.closest('details')?.removeAttribute('open') }}>{i ? translate(`Heading ${i}`) : 'Text'}</button>)}
      </div></details>
      {([['bold', IconBold, 'Bold (⌘B)'], ['italic', IconItalic, 'Italic (⌘I)'], ['strike', IconStrike, 'Strikethrough (⌥⌘X)'], ['inlineCode', IconInlineCode, 'Inline code (⌘E)'], ['bulletList', IconBulletList, 'Bullet list (⌥⌘8)'], ['orderedList', IconOrderedList, 'Numbered list (⌥⌘7)'], ['quote', IconQuote, 'Quote (⇧⌘B)'], ['codeBlock', IconCodeBlock, 'Code block (⌥⌘C)'], ['hr', IconHr, 'Divider']] as const).map(([action, Icon, label]) =>
        <button key={action} title={translate(label)} aria-label={translate(label)} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={() => ref.current?.format(action)}><Icon /></button>)}
      <button title={translate("Insert link (⌘K)")} aria-label={translate("Insert link (⌘K)")} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={() => { const text = ref.current?.getSelectedText() ?? ''; const href = prompt('URL'); if (href) ref.current?.insertLink(text || href, href) }}><IconLink /></button>
      <button title={translate("Insert image")} aria-label={translate("Insert image")} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={() => ref.current?.openImagePicker()}><IconImage /></button>
      <details className="format-menu"><summary onMouseDown={e => e.preventDefault()} title={translate("Table")} aria-label={translate("Table")}><IconTable /></summary><div>
        <button disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={e => { ref.current?.insertTable(3, 3); e.currentTarget.closest('details')?.removeAttribute('open') }}>{translate("Insert table (3×3)")}</button>
        {([['rowAbove', 'Insert Row Above'], ['rowBelow', 'Insert Row Below'], ['colBefore', 'Insert column to the left'], ['colAfter', 'Insert column to the right'], ['deleteRow', 'Delete Row'], ['deleteCol', 'Delete Column']] as const).map(([value, label]) => <button key={value} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={e => { ref.current?.tableCommand(value); e.currentTarget.closest('details')?.removeAttribute('open') }}>{translate(label)}</button>)}
      </div></details>
      <span className="status" title={status} aria-label={status} role="status"><span className="status-text">{status}</span></span>
      <button disabled={busy} onClick={() => void exportPdf()}>{busy ? translate("Exporting …") : translate("Export PDF")}</button>
      <button title="Merkzeug" aria-label="Merkzeug" aria-expanded={extras} onClick={() => setExtras(!extras)}>⋯</button>
    </header>
    {extras && <aside className="editor-extras"><button onClick={() => void request('settings')}>{translate("PDF template …")}</button>{info && <><GuidedTour edition="intellij" seen={true} onSeen={() => void request('tourSeen')} /><VaultGuidance vaultId={info.vault} host={guidanceHost} /></>}</aside>}
    {error && <div role="alert" className="error">{error}</div>}
    {info && <Editor ref={ref} host={host} filePath={info.path} loadToken={0} readonly={info.readonly}
      onLinkClick={href => href.startsWith('#') ? ref.current?.jumpToHeading(decodeURIComponent(href.slice(1))) : void request('open', { href }).catch(e => setError(String(e)))}
      onDirtyChange={dirty => setStatus(dirty ? translate("Syncing changes …") : translate("Synced with IntelliJ"))}
      onSaved={() => setStatus(translate("Synced with IntelliJ"))} />}
  </div>
}
if (new URLSearchParams(location.search).has('pdf')) {
  createRoot(document.getElementById('root')!).render(<PdfView host={{
    getPdfDocs: async () => { const info = await request('init'); setLocale(info.locale); return request('pdfPayload') }, resolveImage: imageUrl,
    pdfProgress: () => {},
    pdfReady: landscape => { void request('pdfReady', { landscape }) },
    pdfError: message => { void request('pdfError', { message }) }
  }} />)
} else createRoot(document.getElementById('root')!).render(<App />)

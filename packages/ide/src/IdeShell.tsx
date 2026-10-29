import { AboutButton } from '@merkzeug/editor/About'
import { ReleaseNotes, ReleaseNotesButton } from '@merkzeug/editor/ReleaseNotes'
import { TemplateLocation } from '@merkzeug/editor/TemplateLocation'
import { liveTemplateCss } from '@merkzeug/editor/templateStyle'
import { IconHeading, IconBold, IconItalic, IconStrike, IconInlineCode, IconBulletList, IconOrderedList, IconQuote, IconCodeBlock, IconHr, IconLink, IconImage, IconTable, IconCallout } from '@merkzeug/editor/icons'
import { calloutLabel } from '@merkzeug/editor/callouts'
import { GITHUB_CALLOUT_TYPES, OBSIDIAN_CALLOUT_TYPES } from '@merkzeug/core/callouts'
import { GuidedTour } from '@merkzeug/editor/GuidedTour'
import { VaultGuidance, type GuidanceHost } from '@merkzeug/editor/VaultGuidance'
import { ImageInsertSettings } from '@merkzeug/editor/ImageInsertSettings'
import type { ImageInsertMode } from '@merkzeug/core/imageInsert'
import { initializeTheme, setHostTheme, setTheme, type HostTheme } from '@merkzeug/editor/theme'
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

/** What differs between IDE adapters; every editor feature stays in this shared shell. */
export interface IdeOptions {
  /** Product name shown in synchronization status, e.g. "IntelliJ" or "VS Code". */
  host: 'IntelliJ' | 'VS Code'
  edition: 'intellij' | 'vscode'
  /** Maps an absolute local image path to a URL the editor view may load. */
  localImageUrl?(absolutePath: string): string
  /** Host appearance computed inside the view instead of supplied by the adapter. */
  hostTheme?(): HostTheme
}

const originImageUrl = (absolute: string) => `${location.origin}/image?path=${encodeURIComponent(absolute)}`
function imageResolver(local: (absolute: string) => string) {
  return (path: string, url: string): string => {
    if (!url || /^(https?:|data:)/i.test(url)) return url
    const decoded = decodeURI(url)
    return local(decoded.startsWith('/') ? decoded : resolvePath(path.slice(0, path.lastIndexOf('/')), decoded))
  }
}
const releaseHost = { claim: (version: string) => request<boolean>('releaseClaim', { version }), seen: (version: string) => request<void>('releaseSeen', { version }) }
const guidanceHost: GuidanceHost = { suppressed: () => request('guidanceSuppressed'), suppress: never => request('guidanceSuppress', { never }), read: name => request('guidanceRead', { name }), append: (name, expected, addition) => request('guidanceAppend', { name, expected, addition }) }
function App({ options }: { options: IdeOptions }) {
  const imageUrl = useMemo(() => imageResolver(options.localImageUrl ?? originImageUrl), [options])
  const synced = translate(`Synced with ${options.host}`)
  const [info, setInfo] = useState<{ path: string; vault: string; readonly: boolean; locale: string; tourSeen: boolean }>()
  const [status, setStatus] = useState(translate("Loading …"))
  const [error, setError] = useState('')
  const [extras, setExtras] = useState(false)
  const [previewEnabled, setPreviewEnabled] = useState(false)
  const [previewCss, setPreviewCss] = useState('')
  const [templateState, setTemplateState] = useState<{ assigned: string | null; templates: string[] }>({ assigned: null, templates: [] })
  useEffect(() => { if (info) void request('templateState').then(setTemplateState).catch(e => setError(String(e))) }, [info, extras])
  const [imageSettings, setImageSettings] = useState<{ appHtml: boolean; vault: ImageInsertMode | null }>()
  useEffect(() => { if (info && extras) void request('imageSettings').then(setImageSettings).catch(e => setError(String(e))) }, [info, extras])
  const changeImageSettings = (change: { appHtml?: boolean; vault?: ImageInsertMode | '' }) =>
    void request<{ appHtml: boolean; vault: ImageInsertMode | null }>('imageSettings', change).then(setImageSettings).catch(e => setError(String(e)))
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
    imageInsertMode: () => request<ImageInsertMode>('imageInsertMode'),
    resolveImage: (path, url) => imageUrl(path, url),
    openMermaidZoom: async (svg) => {
      const dialog = document.createElement('dialog')
      dialog.className = 'diagram-zoom'
      const close = document.createElement('button'); close.textContent = translate("Close"); close.onclick = () => dialog.close()
      const content = document.createElement('div'); content.innerHTML = svg
      dialog.append(close, content); document.body.append(dialog)
      dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal()
    },
    onVaultChanged: (listener) => { listeners.current.add(listener); return () => { listeners.current.delete(listener) } }
  }), [imageUrl])
  useEffect(() => {
    window.__merkzeugTheme = theme => { setTheme('system'); setHostTheme(theme) }
    request<boolean>('templatePreview').then(setPreviewEnabled).catch(e => setError(String(e)))
    request('init').then(result => { setLocale(result.locale); setTheme('system'); setHostTheme(options.hostTheme?.() ?? result.theme); setInfo(result); setStatus(translate(`Synced with ${options.host}`)) }).catch(e => setError(String(e)))
  }, [])
  useEffect(() => {
    // Adapters with native settings (VS Code) announce changes made outside this view.
    window.__merkzeugSettingsChanged = () => {
      request<boolean>('templatePreview').then(setPreviewEnabled).catch(e => setError(String(e)))
      if (info) void request('templateState').then(setTemplateState).catch(e => setError(String(e)))
      void refreshTemplatePreview()
    }
  }, [info])
  useEffect(() => {
    window.__merkzeugChanged = () => { if (info) for (const listener of listeners.current) listener(info.vault, [info.path]) }
  }, [info])
  async function refreshTemplatePreview() {
    try {
      const template = await request<PdfTemplate | null>('template')
      setPreviewCss(template?.css ? liveTemplateCss(template.css) : '')
    } catch (e) { setPreviewCss(''); setError(String(e)) }
  }
  useEffect(() => {
    if (!previewEnabled) return
    void refreshTemplatePreview()
    const refresh = () => { void refreshTemplatePreview() }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [previewEnabled])
  async function toggleTemplatePreview(enabled: boolean) {
    try { await request('templatePreview', { enabled }); setPreviewEnabled(enabled) }
    catch (e) { setError(String(e)) }
  }
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
  useEffect(() => {
    const print = () => { void exportPdf(true) }
    const exportFile = () => { void exportPdf() }
    window.addEventListener('merkzeug-print', print)
    window.addEventListener('merkzeug-export', exportFile)
    return () => { window.removeEventListener('merkzeug-print', print); window.removeEventListener('merkzeug-export', exportFile) }
  })
  async function exportPdf(print = false) {
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
      await request('export', { payload, print })
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <div className={`ide-app${previewEnabled && previewCss ? ' template-live' : ''}`}>
    {info && <ReleaseNotes host={releaseHost} />}
    {previewEnabled && <style>{previewCss}</style>}
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
      <details className="format-menu"><summary onMouseDown={e => e.preventDefault()} title={translate("Callout")} aria-label={translate("Callout")}><IconCallout /></summary><div>
        {[...GITHUB_CALLOUT_TYPES, '', ...OBSIDIAN_CALLOUT_TYPES].map(type => type ? <button key={type} disabled={!info || info.readonly} onMouseDown={e => e.preventDefault()} onClick={e => { ref.current?.insertCallout(type); e.currentTarget.closest('details')?.removeAttribute('open') }}>{calloutLabel(type)}</button> : <div key="obsidian" className="format-menu-section">{translate("More (Obsidian only)")}</div>)}
      </div></details>
      <span className="status" title={status} aria-label={status} role="status"><span className="status-text">{status}</span></span>
      <button disabled={busy} onClick={() => void exportPdf(true)}>{translate("Print…")}</button>
      <button disabled={busy} onClick={() => void exportPdf()}>{busy ? translate("Exporting …") : translate("Export PDF")}</button>
      <button title="Merkzeug" aria-label="Merkzeug" aria-expanded={extras} onClick={() => setExtras(!extras)}>⋯</button>
    </header>
    {extras && <aside className="editor-extras"><TemplateLocation value={templateState.assigned} templates={templateState.templates} onChange={async name => { setTemplateState(await request('templateAssign', { name: name ?? '' })); await refreshTemplatePreview() }} /><div className="editor-extra-actions"><AboutButton openUrl={url => { void request("open", { href: url }).catch(e => setError(String(e))) }} /><ReleaseNotesButton /><button onClick={() => void request('settings').then(refreshTemplatePreview).catch(e => setError(String(e)))}>{translate("PDF template …")}</button><label className="template-preview-toggle"><input type="checkbox" checked={previewEnabled} onChange={e => void toggleTemplatePreview(e.target.checked)} /> {translate('Use PDF template while editing')}</label>{info && import.meta.env.VITE_MERKZEUG_TOURS !== 'disabled' && <><GuidedTour edition={options.edition} seen={true} onSeen={() => void request('tourSeen')} /></>}</div>{imageSettings && <ImageInsertSettings appHtml={imageSettings.appHtml} vault={imageSettings.vault} hasVault onAppChange={appHtml => changeImageSettings({ appHtml })} onVaultChange={vault => changeImageSettings({ vault: vault ?? '' })} />}{previewEnabled && !previewCss && <p>{translate('Assign a PDF template in Settings to preview its content styles.')}</p>}{info && <VaultGuidance vaultId={info.vault} host={guidanceHost} />}</aside>}
    {error && <div role="alert" className="error">{error}</div>}
    {info && <Editor ref={ref} host={host} filePath={info.path} loadToken={0} readonly={info.readonly}
      onLinkClick={href => href.startsWith('#') ? ref.current?.jumpToHeading(decodeURIComponent(href.slice(1))) : void request('open', { href }).catch(e => setError(String(e)))}
      onDirtyChange={dirty => setStatus(dirty ? translate("Syncing changes …") : synced)}
      onSaved={() => setStatus(synced)} />}
  </div>
}
/** Editor view by default; `?pdf` renders the print view for the adapter's Chromium PDF output. */
export function mountIde(options: IdeOptions): void {
  initializeTheme()
  const root = createRoot(document.getElementById('root')!)
  if (new URLSearchParams(location.search).has('pdf')) root.render(<PdfView host={{
    getPdfDocs: async () => { const info = await request('init'); setLocale(info.locale); return request('pdfPayload') }, resolveImage: imageResolver(originImageUrl),
    pdfProgress: () => {},
    pdfReady: landscape => { void request('pdfReady', { landscape }) },
    pdfError: message => { void request('pdfError', { message }) }
  }} />)
  else root.render(<App options={options} />)
}

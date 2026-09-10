import { GuidedTour } from '@merkzeug/editor/GuidedTour'
import { MeetingNotes, type MeetingHost } from '@merkzeug/editor/MeetingNotes'
import { loadSources, sourceEvents } from '@merkzeug/editor/calendarSourceStore'
import { VaultGuidance, type GuidanceHost } from '@merkzeug/editor/VaultGuidance'
import { ThemeSelect } from '@merkzeug/editor/ThemeSelect'
import { setHostTheme, setTheme } from '@merkzeug/editor/theme'
import { initializeTheme } from '@merkzeug/editor/theme'
import { t as translate, setLocale } from '@merkzeug/core/i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor, type EditorHandle } from '@merkzeug/editor'
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
const meetingHost: MeetingHost = {
  sources: { load: () => request('calendarSourcesLoad'), save: value => request('calendarSourcesSave', { value }), fetch: url => request('calendarFetch', { url }) },
  list: async (from, to) => ({ ok: true, events: sourceEvents(await loadSources(meetingHost.sources), from, to) }),
  create: (path, content) => request('createMeeting', { path, content })
}
const guidanceHost: GuidanceHost = { suppressed: () => request('guidanceSuppressed'), suppress: never => request('guidanceSuppress', { never }), read: name => request('guidanceRead', { name }), append: (name, expected, addition) => request('guidanceAppend', { name, expected, addition }) }
function App() {
  const [info, setInfo] = useState<{ path: string; vault: string; readonly: boolean; locale: string; tourSeen: boolean }>()
  const [status, setStatus] = useState(translate("Loading …"))
  const [error, setError] = useState('')
  const [template, setTemplate] = useState<PdfTemplate | null>(null)
  const [meetings, setMeetings] = useState(false)
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
    window.__merkzeugTheme = theme => { setTheme(theme.choice ?? 'system'); setHostTheme(theme) }
    const saveTheme = (event: Event) => { void request('theme', { choice: (event as CustomEvent).detail }).catch(e => setError(String(e))) }
    window.addEventListener('merkzeug-theme-choice', saveTheme)
    request('init').then(result => { setLocale(result.locale); setTheme(result.themeChoice); setHostTheme(result.theme); setInfo(result); setStatus(translate('Synced with IntelliJ')) }).catch(e => setError(String(e)))
    request<PdfTemplate | null>('template').then(setTemplate).catch(e => setError(String(e)))
    return () => window.removeEventListener('merkzeug-theme-choice', saveTheme)
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
      const include = linked.length > 0 && confirm(`${translate("Also include")} ${linked.length} ${translate("linked documents?")}`)
      const paths = include ? [info.path, ...linked] : [info.path]
      const docs = await Promise.all(paths.map(async path => ({ path, content: (await request('read', { path })).text })))
      const payload: PdfPayload = {
        vault: info.vault, docs,
        template: template ? fillTemplate(template, current.text, info.path.split('/').pop()!.replace(/\.md$/i, ''), include) : null
      }
      await request('export', { payload })
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }
  return <div className="ide-app">
    <header>{info && <GuidedTour edition="intellij" seen={info.tourSeen} onSeen={() => void request("tourSeen")} />}<strong>Merkzeug</strong><button onClick={() => setMeetings(true)}>{translate("New meeting note")}</button><ThemeSelect /><span className="status">{status}</span>
      <button onClick={() => void action('undo')}>↶</button><button onClick={() => void action('redo')}>↷</button>
      <button onClick={() => ref.current?.openSearch(false)}>{translate("Search")}</button>
      <button onClick={() => void request<PdfTemplate | null>('template', { choose: true }).then(t => { if (t) setTemplate(t) }).catch(e => setError(String(e)))}>{template?.name ?? translate("PDF template …")}</button>
      <button disabled={busy} onClick={() => void exportPdf()}>{busy ? translate("Exporting …") : translate("Export PDF")}</button>
    </header>
    {info && meetings && <MeetingNotes host={meetingHost} folder={info.vault} onClose={() => setMeetings(false)} onOpen={() => setMeetings(false)} />}
    {info && <VaultGuidance vaultId={info.vault} host={guidanceHost} />}
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

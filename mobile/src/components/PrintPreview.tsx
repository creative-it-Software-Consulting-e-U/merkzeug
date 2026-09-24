import { fillTemplate } from '@merkzeug/core/exportPlan'
import { pdfExportTitle } from '@merkzeug/core/docTitle'
import type { PdfDoc, PdfTemplate, PdfTemplateMargins } from '@merkzeug/core/pdf'
import { useMemo, useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { PdfView } from '@merkzeug/export'
import type { PdfHost } from '@merkzeug/export/host'
import { t } from '@merkzeug/core/i18n'
import { vault } from '../vault'
import { dirname, joinPath, normalizePath, extname } from '../util/paths'
import '@merkzeug/export/print.css'
import './print.css'

type OutputOptions = { title: string; landscape: boolean; header?: string; footer?: string; margins?: PdfTemplateMargins }
const native = registerPlugin<{ printDocument(options: OutputOptions): Promise<void>; exportDocument(options: OutputOptions): Promise<void> }>('Vault')
const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.heic': 'image/heic' }
export function PrintPreview({ path, content, linkedDocs, template, onClose }: { path: string; content: string; linkedDocs: PdfDoc[]; template: PdfTemplate | null; onClose(): void }) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [includeLinked, setIncludeLinked] = useState(false)
  const landscape = useRef(false)
  const started = useRef(false)
  const fallback = path.split('/').pop()?.replace(/\.md$/i, '') ?? ''
  const filled = useMemo(() => template ? fillTemplate(template, content, fallback, includeLinked) : null, [template, content, fallback, includeLinked])
  const host = useMemo<PdfHost>(() => ({
    getPdfDocs: async () => ({ vault: '/', docs: [{ path, content }, ...(includeLinked ? linkedDocs : [])], template: filled }),
    resolveImage: async (note, url) => {
      if (/^(https?:|data:)/i.test(url)) return url
      const decoded = decodeURI(url)
      const absolute = normalizePath(decoded.startsWith('/') ? decoded : joinPath(dirname(note), decoded))
      return `data:${mime[extname(absolute).toLowerCase()] ?? 'application/octet-stream'};base64,${await vault.readFileBase64(absolute)}`
    },
    pdfProgress: () => {},
    pdfError: setError,
    pdfReady: value => { landscape.current = value; setReady(true) }
  }), [path, content, linkedDocs, includeLinked, filled])
  async function output(exportPdf: boolean) {
    if (started.current || !ready) return
    started.current = true; setPrinting(true); setError('')
    try {
      const options = { title: pdfExportTitle(content, fallback, includeLinked), landscape: landscape.current, header: filled?.header, footer: filled?.footer, margins: filled?.margins }
      if (Capacitor.isNativePlatform()) {
        if (exportPdf) await native.exportDocument(options)
        else await native.printDocument(options)
      } else window.print()
    } catch (e) { setError(String(e)) }
    finally { started.current = false; setPrinting(false) }
  }
  return <div className="mobile-print-preview">
    <div className="mobile-print-actions">
      <button disabled={printing} onClick={onClose}>{t('Close')}</button>
      <button disabled={!ready || printing || !!error} onClick={() => void output(true)}>{t('Export as PDF…')}</button>
      <button disabled={!ready || printing || !!error} onClick={() => void output(false)}>{t('Print…')}</button>
      {linkedDocs.length > 0 && <label><input type="checkbox" checked={includeLinked} disabled={printing} onChange={event => { setReady(false); setError(''); setIncludeLinked(event.target.checked) }} />{t('Include linked documents')} ({linkedDocs.length})</label>}
      {!ready && !error && <span>{t('Preparing print preview…')}</span>}
      {error && <p role="alert">{error}</p>}
    </div>
    <PdfView key={String(includeLinked)} host={host} />
  </div>
}

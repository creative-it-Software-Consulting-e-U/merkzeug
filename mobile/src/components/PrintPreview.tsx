import { fillTemplate } from '@merkzeug/core/exportPlan'
import type { PdfTemplate } from '@merkzeug/core/pdf'
import { useMemo, useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { PdfView } from '@merkzeug/export'
import type { PdfHost } from '@merkzeug/export/host'
import { t } from '@merkzeug/core/i18n'
import { vault } from '../vault'
import { dirname, joinPath, normalizePath, extname } from '../util/paths'
import '@merkzeug/export/print.css'
import './print.css'

const native = registerPlugin<{ printDocument(options: { title: string; landscape: boolean }): Promise<void> }>('Vault')
const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.heic': 'image/heic' }
export function PrintPreview({ path, content, template, onClose }: { path: string; content: string; template: PdfTemplate | null; onClose(): void }) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [printing, setPrinting] = useState(false)
  const landscape = useRef(false)
  const started = useRef(false)
  const host = useMemo<PdfHost>(() => ({
    getPdfDocs: async () => ({ vault: '/', docs: [{ path, content }], template: template ? fillTemplate(template, content, path.split('/').pop()?.replace(/\.md$/i, '') ?? '', false) : null }),
    resolveImage: async (note, url) => {
      if (/^(https?:|data:)/i.test(url)) return url
      const decoded = decodeURI(url)
      const absolute = normalizePath(decoded.startsWith('/') ? decoded : joinPath(dirname(note), decoded))
      return `data:${mime[extname(absolute).toLowerCase()] ?? 'application/octet-stream'};base64,${await vault.readFileBase64(absolute)}`
    },
    pdfProgress: () => {},
    pdfError: setError,
    pdfReady: value => { landscape.current = value; setReady(true) }
  }), [path, content, template])
  async function print() {
    if (started.current) return
    started.current = true; setPrinting(true); setError('')
    try {
      if (Capacitor.isNativePlatform()) await native.printDocument({ title: path.split('/').pop() ?? 'Merkzeug', landscape: landscape.current })
      else window.print()
    } catch (e) { setError(String(e)) }
    finally { started.current = false; setPrinting(false) }
  }
  return <div className="mobile-print-preview">
    <div className="mobile-print-actions">
      <button disabled={printing} onClick={onClose}>{t('Close')}</button>
      <button disabled={!ready || printing || !!error} onClick={() => void print()}>{t('Print…')}</button>
      {!ready && !error && <span>{t('Preparing print preview…')}</span>}
      {error && <p role="alert">{error}</p>}
    </div>
    <PdfView host={host} />
  </div>
}

import { PdfView } from '@merkzeug/export'
import type { PdfHost } from '@merkzeug/export/host'
const host: PdfHost = {
  getPdfDocs: () => window.merkzeug.getPdfDocs(),
  pdfProgress: (done, total) => window.merkzeug.pdfProgress(done, total),
  pdfReady: (landscape) => window.merkzeug.pdfReady(landscape),
  pdfError: (message) => window.merkzeug.pdfError(message),
  resolveImage: (path, url) => {
    if (!url || /^(https?:|data:|vault-file:)/i.test(url)) return url
    const decoded = decodeURI(url)
    const absolute = decoded.startsWith('/') ? decoded : path.replace(/[/\\][^/\\]*$/, '') + '/' + decoded
    return 'vault-file://local' + encodeURI(absolute.replace(/\\/g, '/'))
  }
}
export function PdfApp(): React.JSX.Element { return <PdfView host={host} /> }

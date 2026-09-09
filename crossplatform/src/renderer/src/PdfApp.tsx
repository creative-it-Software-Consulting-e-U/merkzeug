import { PdfView } from '@merkzeug/export'
import { vaultFileUrl } from '@merkzeug/core/vaultFileUrl'
import type { PdfHost } from '@merkzeug/export/host'
const host: PdfHost = {
  getPdfDocs: () => window.merkzeug.getPdfDocs(),
  pdfProgress: (done, total) => window.merkzeug.pdfProgress(done, total),
  pdfReady: (landscape) => window.merkzeug.pdfReady(landscape),
  pdfError: (message) => window.merkzeug.pdfError(message),
  resolveImage: vaultFileUrl
}
export function PdfApp(): React.JSX.Element { return <PdfView host={host} /> }

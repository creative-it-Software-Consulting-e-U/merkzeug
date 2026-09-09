import type { PdfPayload } from '@merkzeug/core/pdf'

export interface PdfHost {
  getPdfDocs(): Promise<PdfPayload>
  resolveImage(note: string, url: string): string | Promise<string>
  pdfProgress(done: number, total: number): void
  pdfReady(landscape: boolean): void
  pdfError(message: string): void
}

/** Ein Dokument, das das unsichtbare PDF-Fenster rendern soll */
export interface PdfDoc {
  path: string
  content: string
}

/** Seitenränder einer PDF-Vorlage in Millimetern */
export interface PdfTemplateMargins {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Geladene PDF-Vorlage: HTML/CSS-Teile mit bereits als data-URIs
 * eingebetteten Bildern und ersetzten Platzhaltern.
 */
export interface PdfTemplate {
  name: string
  /** Kopfzeile jeder Seite (Chromium headerTemplate) */
  header?: string
  /** Fußzeile jeder Seite (Chromium footerTemplate) */
  footer?: string
  /** Deckblatt, wird als erste Seite vor den Inhalt gestellt */
  cover?: string
  /** Zusatz-CSS für den Dokumentinhalt */
  css?: string
  margins?: PdfTemplateMargins
}


export interface PdfPayload { vault: string | null; docs: PdfDoc[]; template: PdfTemplate | null }

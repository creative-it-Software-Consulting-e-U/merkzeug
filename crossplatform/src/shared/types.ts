export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
}

export interface GitFileStatus {
  path: string
  /** git status --porcelain two-letter code, e.g. " M", "??", "A " */
  code: string
}

export interface GitStatus {
  isRepo: boolean
  branch?: string
  ahead: number
  behind: number
  hasRemote: boolean
  changes: GitFileStatus[]
}

export interface GitResult {
  ok: boolean
  output: string
}

/** Aktionen, die das Menü an den Renderer schickt */
export type MenuAction =
  | 'newNote'
  | 'newFolder'
  | 'saveNote'
  | 'saveAll'
  | 'closeTab'
  | 'undo'
  | 'redo'
  | 'insertLink'
  | 'insertImage'
  | 'insertTable'
  | 'find'
  | 'findReplace'
  | 'tableRowAbove'
  | 'tableRowBelow'
  | 'tableColBefore'
  | 'tableColAfter'
  | 'tableDeleteRow'
  | 'tableDeleteCol'
  | 'toggleNavMode'
  | 'navBack'
  | 'navForward'
  | 'toggleSplit'
  | 'moveTabOtherPane'
  | 'toggleAssets'
  | 'exportPdf'

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

/** Zustand für das Einstellungs-Fenster (PDF-Vorlagen) */
export interface TemplateState {
  /** Vault des Fensters, aus dem die Einstellungen geöffnet wurden */
  vault: string | null
  templatesRoot: string
  templates: string[]
  /** dem Vault zugewiesene Vorlage (Name) */
  assigned: string | null
}

/** Fortschritt des PDF-Exports, gesendet an das auslösende Fenster */
export interface PdfExportProgress {
  phase: 'start' | 'render' | 'print' | 'done' | 'error'
  /** abgeschlossene Schritte (gerenderte Dokumente; Drucken = letzter Schritt) */
  done?: number
  /** Gesamtschritte = Dokumente + 1 (Drucken) */
  total?: number
}

export interface VaultChange {
  vault: string
}

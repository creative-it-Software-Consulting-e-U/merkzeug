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
  gitAvailable?: boolean
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

export type { CalendarPerson, CalendarEvent, CalendarResult } from '@merkzeug/core/calendar'

/** Aktionen, die das Menü an den Renderer schickt */
export type MenuAction =
  | 'guidedTour'
  | 'tourVideo'
  | 'newNote'
  | 'newMeetingNote'
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

export type { PdfDoc, PdfTemplate, PdfTemplateMargins } from '@merkzeug/core/pdf'
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

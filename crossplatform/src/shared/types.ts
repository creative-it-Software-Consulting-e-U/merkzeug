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

/** Person in einem Kalendertermin (Organisator/Teilnehmer) */
export interface CalendarPerson {
  name?: string
  email?: string
  /** true bei optionaler Teilnahme */
  optional?: boolean
}

/** Termin aus einem lokal eingebundenen Kalender */
export interface CalendarEvent {
  id: string
  title: string
  /** ISO-8601 */
  start: string
  /** ISO-8601 */
  end: string
  allDay: boolean
  location?: string
  /** Name des Kalenders, aus dem der Termin stammt */
  calendar?: string
  organizer?: CalendarPerson
  attendees: CalendarPerson[]
  /** Teilnehmerzahl, falls die Liste (noch) nicht geladen ist (Windows: erst beim Anklicken) */
  attendeeCount?: number
  /** erkannter Besprechungs-Link (Teams/Zoom/Meet/Webex) */
  meetingUrl?: string
}

export interface CalendarResult {
  ok: boolean
  /** denied = Zugriff verweigert, unsupported = Plattform ohne Anbindung */
  error?: 'denied' | 'unsupported' | 'failed'
  message?: string
  events: CalendarEvent[]
}

/** Aktionen, die das Menü an den Renderer schickt */
export type MenuAction =
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

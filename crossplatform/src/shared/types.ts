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

export type { CalendarAccess, CalendarPerson, CalendarEvent, CalendarResult } from '@merkzeug/core/calendar'

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
  | 'toggleSource'
  | 'navBack'
  | 'navForward'
  | 'toggleSplit'
  | 'moveTabOtherPane'
  | 'toggleAssets'
  | 'toggleAssistant'
  | 'printNote'
  | 'exportPdf'

export type { PdfDoc, PdfTemplate, PdfTemplateMargins } from '@merkzeug/core/pdf'
/** Zustand für das Einstellungs-Fenster (PDF-Vorlagen) */
export interface TemplateState {
  cloudSupported: boolean
  cloudRoot: string | null
  cloudError: string | null
  /** Vault des Fensters, aus dem die Einstellungen geöffnet wurden */
  vault: string | null
  templatesRoot: string
  templates: string[]
  /** dem Vault zugewiesene Vorlage (Name) */
  assigned: string | null
}

/** Wie neue Bilder eingefügt werden: App-Einstellung und Festlegung des Vaults */
export interface ImageSettings {
  appHtml: boolean
  vault: import('@merkzeug/core/imageInsert').ImageInsertMode | null
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

// ---- AI assistant --------------------------------------------------------

/** Backends of the assistant panel: hosted APIs with a stored key, or locally installed CLIs that bring their own login. */
export type AiProviderId = 'anthropic' | 'openai' | 'claude-cli' | 'codex-cli'

export interface AiSettings {
  provider: AiProviderId | null
  /** Model per provider; empty string = provider default */
  models: Partial<Record<AiProviderId, string>>
  /** assistant may list, search and read vault files (editing is allowed per session only) */
  vaultRead: boolean
}

export interface AiProviderStatus {
  id: AiProviderId
  /** usable right now (key stored / CLI found) */
  ready: boolean
  /** key stored, CLI path, or why it is not ready */
  detail: string
}

export interface AiStatus {
  settings: AiSettings
  providers: AiProviderStatus[]
  /** whether encrypted key storage works on this machine */
  keyStorage: boolean
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** What the panel sends along with the conversation */
export interface AiContext {
  vaultName: string | null
  notePath: string | null
  noteMarkdown: string | null
  selection: string | null
}

export interface AiChatRequest {
  id: string
  messages: AiChatMessage[]
  context: AiContext
  /** UI language (answers follow the user's text; headings of generated sections use this) */
  locale: string
  /** files of the window's vault: none, read, or read and edit */
  vaultAccess: 'none' | 'read' | 'write'
}

/** A file the assistant listed, searched, read or changed (paths relative to the vault) */
export type AiActivity =
  | { kind: 'list' | 'search' | 'read' | 'write' | 'denied'; path: string; detail?: string }
  | { kind: 'needsWrite'; path: ''; detail: string }

export interface AiFileChange {
  path: string
  kind: 'created' | 'modified' | 'deleted'
}

export type AiChatEvent =
  | { id: string; type: 'delta'; text: string }
  | { id: string; type: 'activity'; activity: AiActivity }
  | {
      id: string
      type: 'done'
      text: string
      model?: string
      /** files changed by this answer; undo restores them */
      changes?: AiFileChange[]
      /** false when a CLI changed files Merkzeug could not snapshot */
      undoComplete?: boolean
      /** the request needs editing, which was not allowed */
      needsWrite?: string
    }
  | { id: string; type: 'error'; message: string; changes?: AiFileChange[] }

export interface AiUndoResult {
  restored: string[]
  /** changed again since the answer – left as they are */
  skipped: string[]
}

/**
 * Obsidian-Callouts (`> [!type]± Titel`), die auch GitHub-Alerts
 * (`> [!NOTE]`, `> [!WARNING]` …) abdecken. Der Marker steht am Anfang der
 * ersten Zeile eines Blockzitats; Typen sind beliebig, unbekannte werden wie
 * `note` dargestellt.
 */

export type CalloutFold = '' | '+' | '-'

export interface CalloutMarker {
  /** Typ wie im Dokument geschrieben, z. B. `info` oder `NOTE` */
  type: string
  /** `-` = eingeklappt, `+` = ausgeklappt (beide klappbar), leer = nicht klappbar */
  fold: CalloutFold
  /** Länge des Markers samt folgender Leerzeichen */
  length: number
}

/** Darstellungsfamilie (Farbe und Symbol) eines Callouts. */
export type CalloutKind =
  | 'note'
  | 'abstract'
  | 'info'
  | 'todo'
  | 'tip'
  | 'success'
  | 'question'
  | 'warning'
  | 'failure'
  | 'danger'
  | 'bug'
  | 'example'
  | 'quote'

/** Typen und Aliase wie in Obsidian; GitHubs fünf Alert-Typen sind enthalten. */
const KINDS: Record<string, CalloutKind> = {
  note: 'note',
  abstract: 'abstract',
  summary: 'abstract',
  tldr: 'abstract',
  info: 'info',
  todo: 'todo',
  tip: 'tip',
  hint: 'tip',
  important: 'tip',
  success: 'success',
  check: 'success',
  done: 'success',
  question: 'question',
  help: 'question',
  faq: 'question',
  warning: 'warning',
  caution: 'warning',
  attention: 'warning',
  failure: 'failure',
  fail: 'failure',
  missing: 'failure',
  danger: 'danger',
  error: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  cite: 'quote'
}

/** Typen für Einfügemenüs: GitHub kennt nur die ersten fünf, Obsidian alle. */
export const GITHUB_CALLOUT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const
export const OBSIDIAN_CALLOUT_TYPES = [
  'info',
  'question',
  'example',
  'success',
  'danger',
  'abstract',
  'todo',
  'failure',
  'bug',
  'quote'
] as const

const MARKER = /^\[!([^\]\s]+)\]([+-]?)[ \t]*/

/** Marker am Anfang der ersten Zitatzeile erkennen. */
export function parseCalloutMarker(text: string): CalloutMarker | null {
  const match = MARKER.exec(text)
  if (!match) return null
  return { type: match[1], fold: match[2] as CalloutFold, length: match[0].length }
}

export function calloutKind(type: string): CalloutKind {
  return KINDS[type.toLowerCase()] ?? 'note'
}

/** Titel ohne eigenen Text: der Typ mit großem Anfangsbuchstaben, wie in Obsidian und GitHub. */
export function calloutDefaultTitle(type: string): string {
  const lower = type.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * remark-stringify maskiert `[` im Fließtext (`\[!NOTE]`), was den Callout
 * zerstören würde. Entfernt die Maskierung im Marker der ersten Zeile eines
 * serialisierten Blockzitats.
 */
export function restoreCalloutMarker(blockquote: string): string {
  return blockquote.replace(/^> (\\?\[(?:\\.|[^\\\]\n])*\]\\?[+-]?)/, (_whole, marker: string) =>
    `> ${marker.replace(/\\(.)/g, '$1')}`
  )
}

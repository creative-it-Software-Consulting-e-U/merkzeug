export const instructionNames = ['AGENTS.md', 'CLAUDE.md'] as const
export type InstructionName = typeof instructionNames[number]
export type GuidanceState = 'present' | 'missing' | 'review'
/** Conservative local heuristic. Ambiguous asset instructions are always reviewed. */
export function inspectGuidance(text: string): GuidanceState {
  const paragraphs = text.toLowerCase().split(/\n\s*\n/)
  const relevant = paragraphs.filter(p => /\.assets|companion|begleit|ressourcen.?ordner/.test(p))
  if (relevant.some(p => /\b(never|not|don't|do not|nicht|niemals)\b.{0,70}(move|rename|verschieb|umbenenn)/s.test(p))) return 'review'
  if (relevant.some(p => /\.assets/.test(p) && /\.md|markdown|notiz|note/.test(p) && /move|verschieb/.test(p) && /rename|umbenenn/.test(p) && /together|along|with|gemeinsam|mit|zugehörig/.test(p))) return 'present'
  return relevant.length ? 'review' : 'missing'
}
export function guidanceAddition(text: string, locale: string): string {
  const german = /\b(und|nicht|datei|ordner|verwende|immer|bitte|werden|soll)\b/i.test(text)
  const english = /\b(the|and|file|folder|always|should|must)\b/i.test(text)
  const de = german || (!english && locale.toLowerCase().startsWith('de'))
  const lines = de ? [
    '## Merkzeug: Markdown-Dateien und Begleitordner',
    'Eine Markdown-Datei `Besprechung.md` kann einen benachbarten Ordner `Besprechung.assets/` besitzen. Beim Verschieben oder Umbenennen gehören beide zusammen: `Plan.md` wird zusammen mit `Plan.assets/` verschoben; bei der Umbenennung zu `Entwurf.md` wird auch der Ordner zu `Entwurf.assets/` umbenannt und relative Bildverweise werden angepasst.',
    'Prüfe vor Änderungen beide Zielnamen. Wenn eine Zieldatei oder ein Zielordner schon existiert, halte an und kläre die Kollision, ohne etwas zu überschreiben oder zusammenzuführen. Ein gemeinsamer Ordner `assets/` gehört nicht zu einer einzelnen Notiz. Diese Regel legt kein Löschverhalten fest.'
  ] : [
    '## Merkzeug: Markdown files and companion folders',
    'A Markdown file `Meeting.md` may have a sibling folder `Meeting.assets/`. Move and rename them together: move `Plan.md` with `Plan.assets/`; when renaming it to `Draft.md`, also rename the folder to `Draft.assets/` and update relative image references.',
    'Check both destination names before making changes. If a destination file or folder already exists, stop and resolve the collision without overwriting or merging anything. A shared `assets/` directory does not belong to a single note. This rule does not define deletion behavior.'
  ]
  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  return (text.length && !text.endsWith('\n') ? newline : '') + newline + lines.join(newline + newline) + newline
}

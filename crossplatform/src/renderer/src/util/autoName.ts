/** Automatische Dateibenennung neuer Notizen nach ihrer Überschrift 1. */

/** Standardname neu angelegter Notizen ("Neue Notiz", "Neue Notiz 2", …). */
export function isDefaultNoteName(base: string): boolean {
  return /^Neue Notiz( \d+)?$/.test(base)
}

/**
 * Macht aus einem Titel einen Dateinamen-Slug: alles klein, Buchstaben
 * (inkl. Umlaute) und Ziffern bleiben, alle anderen Zeichenfolgen werden
 * zu einem "-" zusammengefasst.
 * "2026-08-11 BPP Call Gerulf & Alois - Neustrukturierung"
 * → "2026-08-11-bpp-call-gerulf-alois-neustrukturierung"
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** Liefert den Text der Überschrift 1, wenn die Notiz mit ihr beginnt. */
export function leadingH1(markdown: string): string | null {
  const firstLine = markdown.split('\n').find((line) => line.trim() !== '')
  const match = firstLine?.match(/^#\s+(.+)/)
  return match ? match[1].trim() : null
}

/**
 * Titel eines Markdown-Dokuments: die erste Überschrift 1 (außerhalb von
 * Codeblöcken), von Inline-Auszeichnung befreit — sonst der Fallback
 * (üblicherweise der Dateiname).
 */
export function docTitle(md: string, fallback: string): string {
  let inFence = false
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^#\s+(.+?)\s*#*\s*$/)
    if (m) {
      const text = m[1]
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`]/g, '')
        .trim()
      if (text) return text
    }
  }
  return fallback
}

/**
 * YAML-Frontmatter am Dateianfang abtrennen (Konvention wie Obsidian/Jekyll:
 * erste Zeile `---`, Ende `---` oder `...`). `frontmatter` enthält den Block
 * samt Trennzeilen und Zeilenumbrüchen, sodass `frontmatter + body` wieder
 * exakt den Originaltext ergibt; ohne Frontmatter ist er leer.
 */
export function splitFrontmatter(md: string): { frontmatter: string; body: string } {
  const lines = md.split(/(?<=\n)/)
  if (!/^\uFEFF?---[ \t]*\r?\n$/.test(lines[0] ?? '')) return { frontmatter: '', body: md }
  for (let i = 1; i < lines.length; i++) {
    if (/^(---|\.\.\.)[ \t]*\r?\n?$/.test(lines[i])) {
      return { frontmatter: lines.slice(0, i + 1).join(''), body: lines.slice(i + 1).join('') }
    }
  }
  return { frontmatter: '', body: md }
}

/** `title:` aus dem Frontmatter (nur oberste Ebene), ohne umschließende Anführungszeichen. */
function frontmatterTitle(frontmatter: string): string | null {
  const m = frontmatter.match(/^title[ \t]*:[ \t]*(.+?)[ \t]*\r?$/im)
  if (!m) return null
  let title = m[1].trim()
  const quote = title[0]
  if ((quote === '"' || quote === "'") && title.endsWith(quote) && title.length > 1) {
    title = title.slice(1, -1).trim()
  }
  return title || null
}

/**
 * Werte einer Listen-Eigenschaft aus dem Frontmatter (nur oberste Ebene).
 * Unterstützt die Inline-Form (`key: [a, b]` oder `key: a, b`) und die
 * Block-Form (`key:` gefolgt von `- Eintrag`-Zeilen); umschließende
 * Anführungszeichen je Eintrag entfallen. Ohne den Schlüssel: leere Liste.
 */
export function frontmatterList(frontmatter: string, key: string): string[] {
  const unquote = (s: string): string => s.replace(/^(['"])(.*)\1$/, '$2').trim()
  const lines = frontmatter.split(/\r?\n/)
  const head = new RegExp(`^${key}[ \\t]*:[ \\t]*(.*)$`)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head)
    if (!m) continue
    const rest = m[1].trim()
    if (rest) {
      const inner = rest.startsWith('[') && rest.endsWith(']') ? rest.slice(1, -1) : rest
      return inner
        .split(',')
        .map((s) => unquote(s.trim()))
        .filter(Boolean)
    }
    const items: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      const item = lines[j].match(/^[ \t]*-[ \t]+(.+?)[ \t]*$/)
      if (item) items.push(unquote(item[1]))
      else if (lines[j].trim() !== '') break
    }
    return items.filter(Boolean)
  }
  return []
}

/**
 * Titel eines Markdown-Dokuments: `title:` aus dem YAML-Frontmatter, sonst die
 * erste Überschrift 1 (außerhalb von Codeblöcken, von Inline-Auszeichnung
 * befreit) — sonst der Fallback (üblicherweise der Dateiname).
 */
export function docTitle(md: string, fallback: string): string {
  const { frontmatter, body } = splitFrontmatter(md)
  const fromFrontmatter = frontmatter ? frontmatterTitle(frontmatter) : null
  if (fromFrontmatter) return fromFrontmatter
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
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

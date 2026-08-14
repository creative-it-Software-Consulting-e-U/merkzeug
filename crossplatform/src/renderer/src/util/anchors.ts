/** Anker-Sprünge: Überschriften anhand eines URL-Fragments finden und anspringen. */

/** Normalisierung wie Milkdowns defaultHeadingIdGenerator (erzeugt die DOM-IDs). */
function normalizeLikeMilkdown(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, '-')
}

/** Aggressive Normalisierung: nur [a-z0-9-], Bindestriche zusammengefasst. */
function normalizeAggressive(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Trennt Milkdowns Duplikat-Suffix ("-#2", "-#3", …) vom Fragment ab.
 * index ist 1-basiert: die wievielte Überschrift mit diesem Text gemeint ist.
 */
function stripDuplicateSuffix(fragment: string): { base: string; index: number } {
  const m = /^(.*)-#(\d+)$/.exec(fragment)
  if (m && Number(m[2]) >= 2) return { base: m[1], index: Number(m[2]) }
  return { base: fragment, index: 1 }
}

/**
 * Sucht die Überschrift zu einem Link-Fragment, tolerant in drei Stufen:
 * exakte DOM-ID, dann Überschriftentexte mit derselben Regel normalisiert wie
 * die IDs, zuletzt aggressiv normalisiert (verzeiht Satzzeichen-Unterschiede,
 * z. B. GitHub-Slugs). Groß-/Kleinschreibung spielt keine Rolle.
 */
export function findHeadingForFragment(root: ParentNode, fragment: string): HTMLElement | null {
  const frag = fragment.trim()
  if (!frag) return null
  for (const id of frag === frag.toLowerCase() ? [frag] : [frag, frag.toLowerCase()]) {
    const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    if (el) return el
  }
  const headings = [...root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')]
  const { base, index } = stripDuplicateSuffix(frag.toLowerCase())
  for (const normalize of [normalizeLikeMilkdown, normalizeAggressive]) {
    const wanted = normalize(base)
    if (!wanted) continue
    let seen = 0
    for (const heading of headings) {
      if (normalize(heading.textContent ?? '') !== wanted) continue
      seen += 1
      if (seen === index) return heading
    }
  }
  return null
}

/**
 * Springt zur Überschrift des Fragments (scrollt den nächsten scrollbaren
 * Vorfahren, im Editor also .editor-host) und hebt sie kurz hervor.
 * Liefert false, wenn keine passende Überschrift existiert.
 */
export function jumpToFragment(root: ParentNode, fragment: string): boolean {
  const heading = findHeadingForFragment(root, fragment)
  if (!heading) return false
  heading.scrollIntoView({ block: 'start' })
  // Nachjustieren: Blöcke oberhalb des Ziels (CodeMirror, Bilder, Mermaid)
  // werden teils erst nach dem Sprung fertig gerendert und verschieben das
  // Layout — das Ziel deshalb kurz danach noch einmal ausrichten.
  for (const delay of [250, 700, 1400]) {
    window.setTimeout(() => {
      if (heading.isConnected) heading.scrollIntoView({ block: 'start' })
    }, delay)
  }
  // Animation auch beim erneuten Sprung auf dieselbe Überschrift neu starten
  heading.classList.remove('anchor-flash')
  void heading.offsetWidth
  heading.classList.add('anchor-flash')
  window.setTimeout(() => heading.classList.remove('anchor-flash'), 1600)
  return true
}

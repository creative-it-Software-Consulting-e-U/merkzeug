/** Pfad-Helfer für den Renderer (reine String-Operationen, POSIX + Windows). */

export const SEP = typeof navigator !== 'undefined' && navigator.platform.startsWith('Win') ? '\\' : '/'

function normSeps(p: string): string {
  return p.replace(/\\/g, '/')
}

export function dirname(p: string): string {
  const n = normSeps(p)
  const idx = n.lastIndexOf('/')
  if (idx <= 0) return SEP
  return denorm(n.slice(0, idx))
}

export function basename(p: string, ext?: string): string {
  const n = normSeps(p)
  let base = n.slice(n.lastIndexOf('/') + 1)
  if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length)
  return base
}

export function extname(p: string): string {
  const base = basename(p)
  const idx = base.lastIndexOf('.')
  return idx > 0 ? base.slice(idx) : ''
}

export function joinPath(...parts: string[]): string {
  const joined = parts
    .map((p) => normSeps(p))
    .join('/')
    .replace(/\/{2,}/g, '/')
  return denorm(joined)
}

/** Löst ".."/"." in einem Pfad auf. */
export function normalizePath(p: string): string {
  const n = normSeps(p)
  const abs = n.startsWith('/')
  const out: string[] = []
  for (const part of n.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return denorm((abs ? '/' : '') + out.join('/'))
}

function denorm(p: string): string {
  return SEP === '\\' ? p.replace(/\//g, '\\') : p
}

export function isSubPath(parent: string, child: string): boolean {
  const p = normSeps(parent)
  const c = normSeps(child)
  return c === p || c.startsWith(p.endsWith('/') ? p : `${p}/`)
}

/** Relativer Pfad von einem Ordner zu einem Ziel (mit ".." falls nötig). */
export function relativePath(fromDir: string, to: string): string {
  const f = normSeps(fromDir).split('/').filter(Boolean)
  const t = normSeps(to).split('/').filter(Boolean)
  let common = 0
  while (common < f.length && common < t.length && f[common] === t[common]) common++
  const ups = f.length - common
  const rest = t.slice(common)
  return [...Array(ups).fill('..'), ...rest].join('/')
}

export function isExternalLink(href: string): boolean {
  return /^(https?|mailto|ftp|tel):/i.test(href)
}

/**
 * Trennt einen Link in Pfad und Anker-Fragment ("pfad#fragment").
 * Bei reinen Anker-Links ("#fragment") ist der Pfad leer.
 */
export function splitFragment(href: string): { path: string; fragment: string | null } {
  const idx = href.indexOf('#')
  if (idx === -1) return { path: href, fragment: null }
  let fragment = href.slice(idx + 1)
  try {
    fragment = decodeURIComponent(fragment)
  } catch {
    // ungültige Escape-Sequenzen: Fragment unverändert verwenden
  }
  return { path: href.slice(0, idx), fragment: fragment || null }
}

/**
 * Löst einen Vault-Link auf: relativ zur Notiz, relativ zur Vault-Wurzel
 * (führender "/") oder absolut im Dateisystem.
 * Liefert Kandidaten-Pfade in Prüf-Reihenfolge.
 */
export function resolveVaultLink(href: string, notePath: string, vault: string): string[] {
  const decoded = decodeURI(href).replace(/[?#].*$/, '')
  if (!decoded) return []
  const candidates: string[] = []
  if (normSeps(decoded).startsWith('/')) {
    candidates.push(normalizePath(joinPath(vault, decoded)))
    candidates.push(normalizePath(decoded))
  } else {
    candidates.push(normalizePath(joinPath(dirname(notePath), decoded)))
    candidates.push(normalizePath(joinPath(vault, decoded)))
  }
  return candidates
}

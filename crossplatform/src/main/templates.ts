import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import type { PdfTemplate, PdfTemplateMargins } from '../shared/types'
import { getStoredTemplatesRoot } from './settings'

/** Ränder, wenn Kopf-/Fußzeile Platz brauchen und die Vorlage nichts vorgibt (mm) */
const DEFAULT_MARGINS: PdfTemplateMargins = { top: 24, bottom: 18, left: 10, right: 10 }

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

/**
 * Ordner mit den PDF-Vorlagen (je Vorlage ein Unterordner). Liegt er in einem
 * Cloud-Ordner (iCloud Drive, Google Drive, OneDrive, Dropbox …), synchronisiert
 * der jeweilige Client die Vorlagen zwischen allen Geräten.
 */
export function templatesRoot(): string {
  if (process.env.MERKZEUG_TEMPLATES_ROOT) return process.env.MERKZEUG_TEMPLATES_ROOT
  return getStoredTemplatesRoot() ?? join(app.getPath('userData'), 'PDF-Vorlagen')
}

export function listTemplates(): string[] {
  try {
    return readdirSync(templatesRoot(), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
  } catch {
    return []
  }
}

/** Bild aus dem Vorlagen-Ordner als data-URI, sofern lesbar */
function dataUri(dir: string, ref: string): string | null {
  try {
    const decoded = decodeURI(ref)
    if (decoded.includes('..')) return null
    const file = join(dir, decoded)
    const mime = IMAGE_MIME[extname(file).toLowerCase()]
    if (!mime || !existsSync(file)) return null
    return `data:${mime};base64,${readFileSync(file).toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Bettet relative Bildverweise (src="…" und url(…)) als data-URIs ein.
 * Nötig, weil Chromiums Kopf-/Fußzeilen-Templates keine Dateien nachladen.
 */
function inlineImages(content: string, dir: string): string {
  return content
    .replace(/(src=)(["'])([^"']+)\2/gi, (whole, attr: string, q: string, ref: string) => {
      if (/^(data:|https?:)/i.test(ref)) return whole
      const uri = dataUri(dir, ref)
      return uri ? `${attr}${q}${uri}${q}` : whole
    })
    .replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (whole, q: string, ref: string) => {
      if (/^(data:|https?:)/i.test(ref)) return whole
      const uri = dataUri(dir, ref)
      return uri ? `url(${q}${uri}${q})` : whole
    })
}

function readMargins(dir: string): PdfTemplateMargins | null {
  try {
    const cfg = JSON.parse(readFileSync(join(dir, 'vorlage.json'), 'utf8'))
    const m = cfg?.margins
    if (!m || typeof m !== 'object') return null
    const margins = { ...DEFAULT_MARGINS }
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      if (typeof m[side] === 'number' && m[side] >= 0) margins[side] = m[side]
    }
    return margins
  } catch {
    return null
  }
}

/** Lädt eine Vorlage; Bilder werden eingebettet. null, wenn es sie nicht gibt. */
export function loadTemplate(name: string): PdfTemplate | null {
  const dir = join(templatesRoot(), name)
  if (!existsSync(dir)) return null
  const part = (file: string): string | undefined => {
    const p = join(dir, file)
    return existsSync(p) ? inlineImages(readFileSync(p, 'utf8'), dir) : undefined
  }
  const template: PdfTemplate = {
    name,
    header: part('kopfzeile.html'),
    footer: part('fusszeile.html'),
    cover: part('deckblatt.html'),
    css: part('stil.css')
  }
  template.margins = readMargins(dir) ?? undefined
  if (!template.margins && (template.header || template.footer)) {
    template.margins = DEFAULT_MARGINS
  }
  return template
}

const DEFAULT_HEADER = `<!-- Kopfzeile: erscheint auf jeder Seite (außer Deckblatt-Höhe zählt mit).
     Wichtig: nur Inline-CSS, keine externen Ressourcen.
     Logo einbinden: Bilddatei (z. B. logo.png) in diesen Vorlagen-Ordner legen und
     <img src="logo.png" style="height: 8mm"> einfügen — Merkzeug bettet sie beim Export ein.
     Platzhalter: {{titel}}, {{datum}} sowie
     <span class="pageNumber"></span> und <span class="totalPages"></span> -->
<div style="width: 100%; margin: 0 10mm; padding-bottom: 2mm; border-bottom: 0.5pt solid #999;
            font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9px; color: #666;
            display: flex; justify-content: space-between; align-items: flex-end;">
  <span>{{titel}}</span>
  <span>Meine Firma GmbH</span>
</div>
`

const DEFAULT_FOOTER = `<!-- Fußzeile: erscheint auf jeder Seite. Gleiche Regeln wie kopfzeile.html. -->
<div style="width: 100%; margin: 0 10mm; padding-top: 2mm; border-top: 0.5pt solid #999;
            font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9px; color: #666;
            display: flex; justify-content: space-between;">
  <span>{{datum}}</span>
  <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
</div>
`

const DEFAULT_COVER_EXAMPLE = `<!-- Deckblatt-Beispiel: In „deckblatt.html" umbenennen, dann erscheint es
     als erste Seite des PDFs. Platzhalter: {{titel}}, {{datum}} -->
<div style="display: flex; flex-direction: column; justify-content: center; align-items: center;
            height: 240mm; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <!-- <img src="logo.png" style="height: 20mm"> -->
  <h1 style="font-size: 28pt; margin: 0 0 8pt;">{{titel}}</h1>
  <p style="color: #666; margin: 0;">{{datum}}</p>
</div>
`

const DEFAULT_CSS = `/* Zusatz-CSS für den Dokumentinhalt im PDF (optional).
   Beispiel: Grundschrift verkleinern —
   .pdf-content .milkdown .ProseMirror { font-size: 11pt; } */
`

const DEFAULT_CONFIG = `{
  "margins": { "top": 24, "bottom": 18, "left": 10, "right": 10 }
}
`

const DEFAULT_README = `# PDF-Vorlage

Dieser Ordner ist eine PDF-Vorlage für Merkzeug. Alle Dateien sind optional:

- \`kopfzeile.html\` — Kopfzeile auf jeder Seite
- \`fusszeile.html\` — Fußzeile auf jeder Seite
- \`deckblatt.html\` — Deckblatt als erste Seite (Beispiel: \`deckblatt-beispiel.html\` umbenennen)
- \`stil.css\` — Zusatz-CSS für den Dokumentinhalt
- \`vorlage.json\` — Seitenränder in Millimetern

Platzhalter in den HTML-Dateien: \`{{titel}}\` (\`title:\` aus dem
YAML-Frontmatter, sonst die erste Überschrift 1 der Notiz, sonst der
Dateiname) und \`{{datum}}\` (Exportdatum). In Kopf- und Fußzeile zusätzlich
\`<span class="pageNumber"></span>\` und \`<span class="totalPages"></span>\` für
Seitenzahlen.

Bilder (Logo usw.): Bilddatei mit in diesen Ordner legen und relativ referenzieren,
z. B. \`<img src="logo.png" style="height: 8mm">\` — Merkzeug bettet sie beim Export
automatisch ein. In Kopf- und Fußzeile ist nur Inline-CSS möglich.

Die Vorlage wird einem Vault über Merkzeug → Einstellungen zugewiesen
(gespeichert in \`.merkzeug/settings.json\` im Vault).
`

/** Legt eine neue Vorlage mit Beispieldateien an. Wirft bei Namenskonflikt. */
export function createTemplate(name: string): string {
  const clean = name.trim()
  if (!clean || /[/\\:]/.test(clean) || clean.startsWith('.')) {
    throw new Error('Ungültiger Vorlagen-Name.')
  }
  const dir = join(templatesRoot(), clean)
  if (existsSync(dir)) throw new Error(`Die Vorlage „${clean}“ existiert bereits.`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'kopfzeile.html'), DEFAULT_HEADER)
  writeFileSync(join(dir, 'fusszeile.html'), DEFAULT_FOOTER)
  writeFileSync(join(dir, 'deckblatt-beispiel.html'), DEFAULT_COVER_EXAMPLE)
  writeFileSync(join(dir, 'stil.css'), DEFAULT_CSS)
  writeFileSync(join(dir, 'vorlage.json'), DEFAULT_CONFIG)
  writeFileSync(join(dir, 'LIESMICH.md'), DEFAULT_README)
  return dir
}

// ---- Zuweisung pro Vault (.merkzeug/settings.json im Vault, wandert per Git mit) ----

function vaultSettingsPath(vault: string): string {
  return join(vault, '.merkzeug', 'settings.json')
}

export function getVaultTemplateName(vault: string): string | null {
  try {
    const cfg = JSON.parse(readFileSync(vaultSettingsPath(vault), 'utf8'))
    return typeof cfg.pdfTemplate === 'string' && cfg.pdfTemplate ? cfg.pdfTemplate : null
  } catch {
    return null
  }
}

export function setVaultTemplateName(vault: string, name: string | null): void {
  const path = vaultSettingsPath(vault)
  let cfg: Record<string, unknown> = {}
  try {
    cfg = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    /* noch keine oder unlesbare Vault-Einstellungen */
  }
  if (name) cfg.pdfTemplate = name
  else delete cfg.pdfTemplate
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`)
}

import { t as translate } from '@merkzeug/core/i18n'
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

const DEFAULT_HEADER = `<!-- Header: use inline CSS. Relative image URLs are embedded on export. -->
<div style="width:100%;margin:0 10mm;font:9px Arial;color:#666;display:flex;justify-content:space-between">
  <span>{{titel}}</span><span>Your organization</span>
</div>`
const DEFAULT_FOOTER = `<div style="width:100%;margin:0 10mm;font:9px Arial;color:#666;display:flex;justify-content:space-between">
  <span>{{datum}}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`
const DEFAULT_COVER_EXAMPLE = `<!-- Rename to deckblatt.html to enable this cover. -->
<div class="cover" style="padding-top:70mm;text-align:center;font-family:Arial,sans-serif">
  <h1>{{titel}}</h1><p>{{datum}}</p>
</div>`
const DEFAULT_CSS = `/* Optional PDF content styles, for example:
.pdf-content .milkdown .ProseMirror { font-size: 11pt; }
html.pdf-landscape .cover { padding-top: 30mm !important; }
*/`
const DEFAULT_CONFIG = '{"margins":{"top":24,"bottom":18,"left":10,"right":10}}\n'
const DEFAULT_README = `# Merkzeug PDF template

All files are optional. Existing German filenames remain part of the file format:

- kopfzeile.html: page header
- fusszeile.html: page footer
- deckblatt.html: cover page (rename deckblatt-beispiel.html to enable it)
- stil.css: additional content styles
- vorlage.json: page margins in millimetres

HTML placeholders: {{titel}} is the export title; {{datum}} is the export date.
Use pageNumber and totalPages span classes in headers and footers for page numbers.
Place logo images here and reference them with relative URLs. Headers and footers
require inline CSS. Use html.pdf-landscape in stil.css for landscape-specific rules.

Assign this template through Merkzeug Settings, or choose this folder in IntelliJ.
Desktop assignments are stored in .merkzeug/settings.json inside the vault.
`

/** Legt eine neue Vorlage mit Beispieldateien an. Wirft bei Namenskonflikt. */
export function createTemplate(name: string): string {
  const clean = name.trim()
  if (!clean || /[/\\:]/.test(clean) || clean.startsWith('.')) {
    throw new Error(translate("Invalid template name."))
  }
  const dir = join(templatesRoot(), clean)
  if (existsSync(dir)) throw new Error(`${translate("The template “")}${clean}${translate("” already exists.")}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'kopfzeile.html'), DEFAULT_HEADER)
  writeFileSync(join(dir, 'fusszeile.html'), DEFAULT_FOOTER)
  writeFileSync(join(dir, 'deckblatt-beispiel.html'), DEFAULT_COVER_EXAMPLE)
  writeFileSync(join(dir, 'stil.css'), DEFAULT_CSS)
  writeFileSync(join(dir, 'vorlage.json'), DEFAULT_CONFIG)
  writeFileSync(join(dir, 'README.md'), DEFAULT_README)
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

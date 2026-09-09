import { getLocale } from '@merkzeug/core/i18n'
import type { PdfHost } from './host'
import { useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { frontmatterFlag, frontmatterScalar, pdfExportTitle, splitFrontmatter } from '@merkzeug/core/docTitle'
import type { PdfDoc, PdfTemplate } from '@merkzeug/core/pdf'
import { renderMermaid } from '@merkzeug/editor/mermaid'
import { isExternalLink, resolveVaultLink } from '@merkzeug/core/paths'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

/**
 * Nutzbare Inhaltsbreite einer A4-Seite im Hochformat (96 dpi, abzüglich der
 * Standard-Druckränder von Chromium). Breitere Tabellen würden rechts
 * abgeschnitten — dann wird das ganze PDF im Querformat gedruckt.
 */
const PORTRAIT_CONTENT_WIDTH = 710

/**
 * Größte Diagrammhöhe, die sicher auf eine Seite passt (auch im Querformat,
 * abzüglich Kopf-/Fußzeilenränder). Höhere Diagramme werden verkleinert,
 * damit sie nicht über Seitengrenzen umbrechen.
 */
const MAX_DIAGRAM_HEIGHT = 600

/**
 * Mermaid gibt dem SVG `width="100%"` und nur eine max-width — beim
 * Bildschirm-Layout ist das fein, aber Chromiums Druck-Layout malt solche
 * SVGs winzig, während der Umfluss die volle Höhe reserviert. Deshalb feste
 * Pixelmaße aus der viewBox setzen, verkleinert auf Seitenbreite und -höhe.
 */
function fixSvgPrintSize(svg: SVGSVGElement): void {
  const vb = svg.viewBox.baseVal
  if (!vb || vb.width <= 0 || vb.height <= 0) return
  const scale = Math.min(1, PORTRAIT_CONTENT_WIDTH / vb.width, MAX_DIAGRAM_HEIGHT / vb.height)
  svg.style.maxWidth = ''
  svg.setAttribute('width', String(Math.floor(vb.width * scale)))
  svg.setAttribute('height', String(Math.floor(vb.height * scale)))
}

function needsLandscape(): boolean {
  return [...document.querySelectorAll<HTMLTableElement>('.pdf-content table')].some((table) => {
    // Milkdown streckt Tabellen auf Containerbreite; maßgeblich ist die
    // Mindestbreite: erst wenn sie die Seite sprengt, wird abgeschnitten.
    const previous = table.style.cssText
    table.style.tableLayout = 'auto'
    table.style.width = 'min-content'
    const minWidth = table.scrollWidth
    table.style.cssText = previous
    return minWidth > PORTRAIT_CONTENT_WIDTH
  })
}

/** Absoluter Pfad eines Link-Ziels, sofern es ein mitexportiertes Dokument trifft. */
function anchorFor(
  target: string,
  docPath: string,
  vault: string | null,
  anchors: Map<string, string>
): string | null {
  for (const cand of resolveVaultLink(target, docPath, vault ?? '')) {
    const withMd = cand.toLowerCase().endsWith('.md') ? cand : `${cand}.md`
    const hit = anchors.get(cand) ?? anchors.get(withMd)
    if (hit) return hit
  }
  return null
}

/**
 * Schreibt Vault-Links im Markdown um: Ziele, die mit im PDF sind, werden zu
 * Ankern (interne PDF-Sprungziele), alle anderen Vault-Links zu reinem Text.
 * Web-Links bleiben unverändert; Codeblöcke und Inline-Code werden ausgespart.
 */
function rewriteLinks(
  md: string,
  docPath: string,
  vault: string | null,
  anchors: Map<string, string>
): string {
  const rewriteSegment = (segment: string): string =>
    segment
      // Inline-Links [Text](ziel) — Bilder (![...]) unangetastet
      .replace(
        /(!?)\[([^\]]*)\]\(\s*<?([^)>\s]+)>?([^)]*)\)/g,
        (whole, bang: string, text: string, target: string, rest: string) => {
          if (bang === '!' || isExternalLink(target) || target.startsWith('#')) return whole
          const anchor = anchorFor(target, docPath, vault, anchors)
          return anchor ? `[${text}](#${anchor}${rest})` : text
        }
      )
      // Referenz-Definitionen [ref]: ziel
      .replace(/^(\[[^\]]+\]:\s*)(\S+)(.*)$/gm, (whole, head: string, target: string, rest: string) => {
        if (isExternalLink(target) || target.startsWith('#')) return whole
        const anchor = anchorFor(target, docPath, vault, anchors)
        return anchor ? `${head}#${anchor}${rest}` : whole
      })

  // Codeblöcke und Inline-Code unverändert lassen
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, i) => (i % 2 === 0 ? rewriteSegment(part) : part))
    .join('')
}

function DocView({
  doc,
  vault,
  anchors,
  anchorId,
  onDone,
  host
}: {
  doc: PdfDoc
  vault: string | null
  anchors: Map<string, string>
  anchorId: string
  onDone: () => void
  host: PdfHost
}): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let crepe: Crepe | null = null
    let cancelled = false

    // Bildpfade wie im Editor auflösen: relativ zur jeweiligen Datei
    const displayUrl = (url: string): string | Promise<string> => host.resolveImage(doc.path, url)

    // Eigener Container je Effekt-Durchlauf: das Aufräumen entfernt ihn
    // mitsamt allem, was ein noch laufendes crepe.create() später einhängt —
    // sonst zählt buildToc() Überschriften doppelt (StrictMode-Doppellauf)
    const container = document.createElement('div')

    void (async () => {
      if (!rootRef.current) return
      rootRef.current.innerHTML = ''
      rootRef.current.appendChild(container)
      crepe = new Crepe({
        root: container,
        // Frontmatter gehört nicht in den sichtbaren PDF-Inhalt
        defaultValue: rewriteLinks(splitFrontmatter(doc.content).body, doc.path, vault, anchors),
        features: {
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false,
          [Crepe.Feature.BlockEdit]: false,
          [Crepe.Feature.CodeMirror]: false,
          [Crepe.Feature.Toolbar]: false
        },
        featureConfigs: {
          [Crepe.Feature.ImageBlock]: {
            proxyDomURL: displayUrl
          }
        }
      })
      await crepe.create()
      if (cancelled) return
      crepe.setReadonly(true)

      // Export is eager: render every diagram, independent of viewport visibility.
      for (const pre of container.querySelectorAll<HTMLPreElement>('pre[data-language="mermaid"]')) {
        const svg = await renderMermaid(pre.textContent ?? '', true)
        if (cancelled) return
        const preview = document.createElement('div')
        preview.className = 'mermaid-preview'
        preview.innerHTML = svg
        const element = preview.querySelector('svg')
        if (element) fixSvgPrintSize(element)
        pre.replaceWith(preview)
      }
      const images = [...container.querySelectorAll('img')]
      await Promise.all(images.map(image => image.decode()))
      await document.fonts.ready
      if (!cancelled) onDone()

    })().catch(error => { if (!cancelled) host.pdfError(String(error)) })

    return () => {
      cancelled = true
      if (crepe) void crepe.destroy()
      container.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  return (
    <div className="pdf-doc" id={anchorId}>
      <div ref={rootRef} className="pdf-content" />
    </div>
  )
}

interface TocEntry {
  id: string
  text: string
  level: number
}

/** Titel des PDF-Inhaltsverzeichnisses je Dokumentsprache (`language:` im Frontmatter). */
const TOC_TITLES: Record<string, string> = {
  de: 'Inhaltsverzeichnis',
  en: 'Table of Contents',
  fr: 'Table des matières',
  es: 'Índice',
  it: 'Indice',
  pt: 'Índice',
  nl: 'Inhoudsopgave'
}

/** `language:`/`lang:` aus dem Frontmatter der (Index-)Datei, z. B. `en` oder `en-US`. */
function docLanguage(content: string): string | null {
  const { frontmatter } = splitFrontmatter(content)
  return frontmatterScalar(frontmatter, 'language') ?? frontmatterScalar(frontmatter, 'lang')
}

/** English is the fallback; explicit document languages are preserved. */
function tocTitle(language: string | null): string {
  if (!language) return /^de(?:[-_]|$)/i.test(getLocale()) ? TOC_TITLES.de : TOC_TITLES.en
  const primary = language.toLowerCase().split(/[-_]/)[0]
  return TOC_TITLES[primary] ?? TOC_TITLES.en
}

/**
 * Einträge fürs Inhaltsverzeichnis aus den fertig gerenderten Dokumenten
 * einsammeln (H1–H3). Fehlende oder doppelte Überschriften-IDs (möglich, weil
 * jedes Dokument eine eigene Milkdown-Instanz ist) werden eindeutig ersetzt.
 */
function buildToc(): TocEntry[] {
  const entries: TocEntry[] = []
  const seen = new Set<string>()
  let n = 0
  for (const docEl of document.querySelectorAll('.pdf-doc')) {
    for (const heading of docEl.querySelectorAll<HTMLElement>('h1, h2, h3')) {
      const text = heading.textContent?.trim()
      if (!text) continue
      n += 1
      if (!heading.id || seen.has(heading.id)) heading.id = `pdf-toc-target-${n}`
      seen.add(heading.id)
      entries.push({ id: heading.id, text, level: Number(heading.tagName[1]) })
    }
  }
  return entries
}

/** Unsichtbares Fenster (#pdf): rendert die Dokumente und meldet „fertig“ an den Main-Prozess. */
export function PdfView({ host }: { host: PdfHost }): React.JSX.Element {
  const [payload, setPayload] = useState<{
    vault: string | null
    docs: PdfDoc[]
    template: PdfTemplate | null
  } | null>(null)
  const [complete, setComplete] = useState(false)
  const [toc, setToc] = useState<TocEntry[] | null>(null)
  const doneCount = useRef(0)

  useEffect(() => {
    void host.getPdfDocs().then(setPayload).catch(error => host.pdfError(String(error)))
  }, [])

  // Vorlage anwenden: Zusatz-CSS injizieren; Dokumenttitel = Notizname
  // (Chromiums <span class="title"> in Kopf-/Fußzeile nutzt den Fenstertitel)
  useEffect(() => {
    if (!payload || payload.docs.length === 0) return
    const first = payload.docs[0]
    const fallback = first.path.split(/[/\\]/).pop()?.replace(/\.md$/i, '') ?? 'Merkzeug'
    // Mehr als ein Dokument gibt es nur beim Export „mit verlinkten
    // Dokumenten“ — dann darf pdf-linked-title: den Titel übersteuern
    document.title = pdfExportTitle(first.content, fallback, payload.docs.length > 1)
    // Dokumentsprache ans <html>-Element (u. a. für Silbentrennung im Druck)
    const language = docLanguage(first.content)
    document.documentElement.lang = language ?? getLocale()
    if (!payload.template?.css) return
    const style = document.createElement('style')
    style.textContent = payload.template.css
    document.head.appendChild(style)
    return () => style.remove()
  }, [payload])

  const docs = payload?.docs ?? []
  // Pfad → Anker-ID: Links zwischen den exportierten Dokumenten werden zu PDF-Sprungzielen
  const anchors = new Map(docs.map((d, i) => [d.path, `pdf-doc-${i}`]))

  const handleDone = (): void => {
    doneCount.current += 1
    host.pdfProgress(doneCount.current, docs.length)
    if (docs.length > 0 && doneCount.current >= docs.length) {
      // pdf-toc: im Frontmatter der ersten (Index-)Datei aktiviert ein
      // Inhaltsverzeichnis vor dem Inhalt (nach dem Deckblatt)
      if (frontmatterFlag(splitFrontmatter(docs[0].content).frontmatter, 'pdf-toc')) {
        setToc(buildToc())
      }
      // kurze Schonfrist für Layout/Schriften, dann drucken lassen
      setComplete(true)
    }
  }

  useEffect(() => {
    if (!complete) return
    let cancelled = false
    void Promise.all([document.fonts.ready, ...[...document.querySelectorAll<HTMLImageElement>('.pdf-app img')].map(image => image.decode())]).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return
        const landscape = needsLandscape()
        document.documentElement.classList.toggle('pdf-landscape', landscape)
        host.pdfReady(landscape)
      }))
    }).catch(error => host.pdfError(String(error)))
    return () => { cancelled = true }
  }, [complete])

  return (
    <div className="pdf-app">
      {payload?.template?.cover && (
        <div className="pdf-cover" dangerouslySetInnerHTML={{ __html: payload.template.cover }} />
      )}
      {toc && toc.length > 0 && (
        <nav className="pdf-toc">
          <h1 className="pdf-toc-title">
            {tocTitle(docs.length > 0 ? docLanguage(docs[0].content) : null)}
          </h1>
          <ul>
            {toc.map((entry) => (
              <li key={entry.id} className={`pdf-toc-l${entry.level}`}>
                <a href={`#${entry.id}`}>{entry.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {docs.map((doc, i) => (
        <DocView
          key={doc.path}
          doc={doc}
          vault={payload?.vault ?? null}
          anchors={anchors}
          anchorId={`pdf-doc-${i}`}
          onDone={handleDone}
          host={host}
        />
      ))}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Crepe } from '@milkdown/crepe'
import { docTitle } from '../../shared/docTitle'
import type { PdfDoc, PdfTemplate } from '../../shared/types'
import { renderMermaid } from './util/mermaid'
import { isExternalLink, resolveVaultLink } from './util/paths'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

/** Anzahl der Mermaid-Blöcke im Markdown, für die Fertig-Erkennung */
function countMermaidBlocks(md: string): number {
  return (md.match(/^[ \t]*```mermaid/gm) ?? []).length
}

/**
 * Nutzbare Inhaltsbreite einer A4-Seite im Hochformat (96 dpi, abzüglich der
 * Standard-Druckränder von Chromium). Breitere Tabellen würden rechts
 * abgeschnitten — dann wird das ganze PDF im Querformat gedruckt.
 */
const PORTRAIT_CONTENT_WIDTH = 710

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
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
  onDone
}: {
  doc: PdfDoc
  vault: string | null
  anchors: Map<string, string>
  anchorId: string
  onDone: () => void
}): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let crepe: Crepe | null = null
    let cancelled = false

    // Bildpfade wie im Editor auflösen: relativ zur jeweiligen Datei
    const displayUrl = (url: string): string => {
      if (!url || isExternalLink(url) || url.startsWith('data:') || url.startsWith('vault-file:')) {
        return url
      }
      const decoded = decodeURI(url)
      const abs = decoded.startsWith('/')
        ? decoded
        : `${doc.path.replace(/[/\\][^/\\]*$/, '')}/${decoded}`
      return `vault-file://local${encodeURI(abs.replace(/\\/g, '/'))}`
    }

    void (async () => {
      if (!rootRef.current) return
      rootRef.current.innerHTML = ''
      crepe = new Crepe({
        root: rootRef.current,
        defaultValue: rewriteLinks(doc.content, doc.path, vault, anchors),
        features: {
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.AI]: false,
          [Crepe.Feature.TopBar]: false,
          [Crepe.Feature.BlockEdit]: false,
          [Crepe.Feature.Toolbar]: false
        },
        featureConfigs: {
          [Crepe.Feature.CodeMirror]: {
            previewOnlyByDefault: true,
            renderPreview: (
              language: string,
              content: string,
              apply: (v: null | string | HTMLElement) => void
            ) => {
              if (language !== 'mermaid' || !content.trim()) return null
              renderMermaid(content, true)
                .then((svg) => {
                  const wrap = document.createElement('div')
                  wrap.className = 'mermaid-preview'
                  wrap.innerHTML = svg
                  apply(wrap)
                })
                .catch(() => {
                  const err = document.createElement('div')
                  err.className = 'mermaid-error'
                  err.textContent = 'Mermaid-Diagramm konnte nicht gerendert werden.'
                  apply(err)
                })
            }
          },
          [Crepe.Feature.ImageBlock]: {
            proxyDomURL: displayUrl
          }
        }
      })
      await crepe.create()
      if (cancelled) return
      crepe.setReadonly(true)

      // warten, bis alle Mermaid-Diagramme und Bilder fertig sind
      // (der Scroll-Durchlauf der PdfApp macht sie nach und nach sichtbar)
      const expectedSvgs = countMermaidBlocks(doc.content)
      const deadline = Date.now() + 120_000
      while (!cancelled && Date.now() < deadline) {
        const root = rootRef.current
        if (root) {
          const svgs = root.querySelectorAll('.mermaid-preview svg, .mermaid-error').length
          const imgs = [...root.querySelectorAll('img')]
          if (svgs >= expectedSvgs && imgs.every((img) => img.complete)) break
        }
        await sleep(200)
      }
      if (!cancelled) onDone()
    })()

    return () => {
      cancelled = true
      if (crepe) void crepe.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  return (
    <div className="pdf-doc" id={anchorId}>
      <div ref={rootRef} className="pdf-content" />
    </div>
  )
}

/** Unsichtbares Fenster (#pdf): rendert die Dokumente und meldet „fertig“ an den Main-Prozess. */
export function PdfApp(): React.JSX.Element {
  const [payload, setPayload] = useState<{
    vault: string | null
    docs: PdfDoc[]
    template: PdfTemplate | null
  } | null>(null)
  const doneCount = useRef(0)

  useEffect(() => {
    void window.merkzeug.getPdfDocs().then(setPayload)
  }, [])

  // Vorlage anwenden: Zusatz-CSS injizieren; Dokumenttitel = Notizname
  // (Chromiums <span class="title"> in Kopf-/Fußzeile nutzt den Fenstertitel)
  useEffect(() => {
    if (!payload || payload.docs.length === 0) return
    const first = payload.docs[0]
    const fallback = first.path.split(/[/\\]/).pop()?.replace(/\.md$/i, '') ?? 'Merkzeug'
    document.title = docTitle(first.content, fallback)
    if (!payload.template?.css) return
    const style = document.createElement('style')
    style.textContent = payload.template.css
    document.head.appendChild(style)
    return () => style.remove()
  }, [payload])

  // Crepe erzeugt Mermaid-Vorschauen erst, wenn der Block sichtbar wird.
  // Deshalb einmal langsam durch den gesamten Inhalt scrollen, bis alle
  // erwarteten Diagramme gerendert sind (oder nichts mehr dazukommt).
  useEffect(() => {
    if (!payload || payload.docs.length === 0) return
    let cancelled = false
    void (async () => {
      const totalExpected = payload.docs.reduce((n, d) => n + countMermaidBlocks(d.content), 0)
      const rendered = (): number =>
        document.querySelectorAll('.mermaid-preview svg, .mermaid-error').length
      const step = Math.max(400, window.innerHeight - 200)
      let idleRounds = 0
      let lastCount = -1
      while (!cancelled && idleRounds < 60) {
        const atBottom =
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
        const count = rendered()
        if (atBottom && count >= totalExpected) break
        if (atBottom) {
          // unten angekommen, aber noch nicht alles gerendert: abwarten,
          // aber aufgeben, wenn längere Zeit nichts mehr dazukommt
          idleRounds = count === lastCount ? idleRounds + 1 : 0
        } else {
          window.scrollBy(0, step)
        }
        lastCount = count
        await sleep(250)
      }
      window.scrollTo(0, 0)
    })()
    return () => {
      cancelled = true
    }
  }, [payload])

  const docs = payload?.docs ?? []
  // Pfad → Anker-ID: Links zwischen den exportierten Dokumenten werden zu PDF-Sprungzielen
  const anchors = new Map(docs.map((d, i) => [d.path, `pdf-doc-${i}`]))

  const handleDone = (): void => {
    doneCount.current += 1
    window.merkzeug.pdfProgress(doneCount.current, docs.length)
    if (docs.length > 0 && doneCount.current >= docs.length) {
      // kurze Schonfrist für Layout/Schriften, dann drucken lassen
      void document.fonts.ready.then(() =>
        setTimeout(() => window.merkzeug.pdfReady(needsLandscape()), 300)
      )
    }
  }

  return (
    <div className="pdf-app">
      {payload?.template?.cover && (
        <div className="pdf-cover" dangerouslySetInnerHTML={{ __html: payload.template.cover }} />
      )}
      {docs.map((doc, i) => (
        <DocView
          key={doc.path}
          doc={doc}
          vault={payload?.vault ?? null}
          anchors={anchors}
          anchorId={`pdf-doc-${i}`}
          onDone={handleDone}
        />
      ))}
    </div>
  )
}

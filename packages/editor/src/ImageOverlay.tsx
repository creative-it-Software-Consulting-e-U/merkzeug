import { isImageSize, type ImageAlign } from '@merkzeug/core/htmlImages'
import { t as translate } from '@merkzeug/core/i18n'
import type { EditorView } from '@milkdown/kit/prose/view'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { setImageEmbedding, targetImage, updateHtmlImage, type ImageTarget } from './imageTools'

const GAP = 6
const MARGIN = 8

/** Natürliches Seitenverhältnis (Breite/Höhe) des Bildes, sobald es geladen ist. */
function naturalRatio(image: HTMLImageElement | null): number | null {
  return image && image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : null
}

/** Pixelwert passend zur anderen Seite; Prozentangaben lassen sich nicht umrechnen. */
function counterpart(value: string, ratio: number | null, fromWidth: boolean): string {
  if (!ratio || !/^\d+$/.test(value)) return ''
  return String(Math.round(fromWidth ? Number(value) / ratio : Number(value) * ratio))
}

/**
 * Leiste über dem ausgewählten Bild: HTML-`<img>` ein/aus, Größe und Ausrichtung.
 * Größe und Ausrichtung gibt es nur für HTML-Bilder, weil Markdown-Bilder keine kennen.
 */
export function ImageOverlay({ view, target, scroller }: { view: EditorView; target: ImageTarget; scroller: HTMLElement | null }) {
  const isHtml = target.kind === 'html'
  const image = target.block?.images[target.index]
  const [width, setWidth] = useState(image?.width ?? '')
  const [height, setHeight] = useState(image?.height ?? '')
  const [locked, setLocked] = useState(!(image?.width && image?.height))
  const [invalid, setInvalid] = useState<'width' | 'height' | null>(null)
  const [ratio, setRatio] = useState<number | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const bar = useRef<HTMLDivElement>(null)

  const place = useCallback((): void => {
    const element = targetImage(view, target)
    const own = bar.current
    if (!element || !own) return setPosition(null)
    const rect = element.getBoundingClientRect()
    const bounds = (scroller ?? document.documentElement).getBoundingClientRect()
    if (rect.bottom < bounds.top || rect.top > bounds.bottom) return setPosition(null)
    const above = rect.top - own.offsetHeight - GAP
    // Kein Platz über dem Bild: an die Oberkante innerhalb des Bildes rücken
    const top = above >= Math.max(bounds.top, 0) ? above : Math.max(rect.top, bounds.top) + GAP
    const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - own.offsetWidth - MARGIN))
    setPosition({ top, left })
  }, [view, target, scroller])

  useLayoutEffect(() => {
    place()
    const element = targetImage(view, target)
    const update = (): void => { setRatio(naturalRatio(element)); place() }
    update()
    element?.addEventListener('load', update)
    const observer = element ? new ResizeObserver(place) : null
    if (element) observer?.observe(element)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      element?.removeEventListener('load', update)
      observer?.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [view, target, place])

  useEffect(() => { setInvalid(null) }, [target])

  const commit = (side: 'width' | 'height', value: string): void => {
    const trimmed = value.trim()
    if (trimmed !== '' && !isImageSize(trimmed)) return setInvalid(side)
    setInvalid(null)
    // Mit festem Seitenverhältnis genügt eine Seite; der Browser berechnet die andere
    if (locked) updateHtmlImage(view, target, side === 'width' ? { width: trimmed, height: '' } : { width: '', height: trimmed })
    else updateHtmlImage(view, target, { [side]: trimmed })
  }

  const toggleLock = (): void => {
    const next = !locked
    setLocked(next)
    if (next && width && height) updateHtmlImage(view, target, { height: '' })
  }

  const field = (side: 'width' | 'height', value: string, setValue: (value: string) => void, other: string) => (
    <label className="image-overlay-size">
      <span>{side === 'width' ? translate('W') : translate('H')}</span>
      <input
        value={value}
        disabled={!isHtml}
        aria-invalid={invalid === side}
        aria-label={side === 'width' ? translate('Width') : translate('Height')}
        inputMode="numeric"
        placeholder={locked ? counterpart(other, ratio, side === 'height') : ''}
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => commit(side, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); commit(side, event.currentTarget.value); view.focus() }
          else if (event.key === 'Escape') { event.preventDefault(); view.focus() }
        }}
      />
    </label>
  )

  const align = target.block?.align ?? 'left'
  const alignButton = (value: ImageAlign, label: string, icon: string) => (
    <button
      type="button"
      className={isHtml && align === value ? 'active' : undefined}
      disabled={!isHtml || !target.alone}
      aria-pressed={isHtml && align === value}
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => updateHtmlImage(view, target, { align: value })}
    >{icon}</button>
  )
  // Verlinkte oder gruppierte Bilder kann Markdown nicht ausdrücken
  const lossless = !isHtml || (target.block?.images.length === 1 && !target.block.linked)

  return createPortal(
    <div
      ref={bar}
      className="image-overlay"
      role="toolbar"
      aria-label={translate('Image options')}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden', top: 0, left: 0 }}
      onMouseDown={(event) => { if (!(event.target instanceof HTMLInputElement)) event.preventDefault() }}
    >
      <label className="image-overlay-embed" title={lossless ? undefined : translate('Linked or grouped images stay HTML.')}>
        <input
          type="checkbox"
          checked={isHtml}
          disabled={!lossless}
          onChange={(event) => { setImageEmbedding(view, target, event.target.checked); view.focus() }}
        />
        {translate('HTML <img>')}
      </label>
      <span className="image-overlay-group" title={isHtml ? undefined : translate('Size and alignment need an HTML <img> tag.')}>
        {field('width', width, setWidth, height)}
        <button
          type="button"
          className={locked ? 'active' : undefined}
          disabled={!isHtml}
          aria-pressed={locked}
          title={translate('Keep aspect ratio')}
          aria-label={translate('Keep aspect ratio')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleLock}
        >{locked ? '🔒' : '🔓'}</button>
        {field('height', height, setHeight, width)}
        <button
          type="button"
          disabled={!isHtml || (!image?.width && !image?.height)}
          title={translate('Original size')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => updateHtmlImage(view, target, { width: '', height: '' })}
        >{translate('Original')}</button>
      </span>
      <span className="image-overlay-group image-overlay-align">
        {alignButton('left', translate('Align left'), '⇤')}
        {alignButton('center', translate('Center'), '↔')}
        {alignButton('right', translate('Align right'), '⇥')}
      </span>
    </div>,
    document.body
  )
}

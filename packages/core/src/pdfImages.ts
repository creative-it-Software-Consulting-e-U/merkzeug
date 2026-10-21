/** The parts of HTMLImageElement the PDF export waits on. */
export interface DecodableImage {
  getAttribute(name: string): string | null
  decode(): Promise<void>
}

/**
 * Waits until the images can be printed. ProseMirror inserts source-less
 * `<img class="ProseMirror-separator">` placeholders after inline nodes such as
 * raw HTML; Chromium rejects `decode()` for them. Those placeholders and broken
 * images are skipped so one image cannot abort the whole export.
 */
export async function imagesDecoded(images: Iterable<DecodableImage>): Promise<void> {
  await Promise.all([...images]
    .filter(image => image.getAttribute('src'))
    .map(image => image.decode().catch(() => undefined)))
}

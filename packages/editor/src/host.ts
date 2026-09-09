/** The shell owns persistence. IDE adapters update their Document, never the file. */
export interface EditorHost {
  readFile(path: string, options?: { peek?: boolean }): Promise<string>
  writeFile(path: string, markdown: string): Promise<void>
  /** Optional synchronous flush for Electron's beforeunload; other hosts own lifecycle. */
  writeFileSync?(path: string, markdown: string): boolean
  onSaveError?(message: string): void
  saveDelayMs?: number
  saveImage(path: string, base64: string, extension: string): Promise<string>
  resolveImage(path: string, url: string): string | Promise<string>
  openMermaidZoom(svg: string): Promise<void>
  onVaultChanged?(listener: (vault: string, paths: string[]) => void): () => void
}

export interface JumpTarget {
  fragment?: string
  scrollTop?: number
  token: number
}

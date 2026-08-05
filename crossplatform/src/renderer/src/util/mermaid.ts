let mermaidModule: typeof import('mermaid').default | null = null
let counter = 0

async function getMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidModule) {
    const mod = await import('mermaid')
    mermaidModule = mod.default
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    mermaidModule.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark ? 'dark' : 'default'
    })
  }
  return mermaidModule
}

/** Rendert Mermaid-Quelltext zu SVG; wirft bei Syntaxfehlern. */
export async function renderMermaid(code: string): Promise<string> {
  const mermaid = await getMermaid()
  counter += 1
  const { svg } = await mermaid.render(`mynotion-mermaid-${counter}`, code)
  return svg
}

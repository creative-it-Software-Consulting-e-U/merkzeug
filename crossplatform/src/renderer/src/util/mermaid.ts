let mermaidModule: typeof import('mermaid').default | null = null
let counter = 0

async function getMermaid(forceLight: boolean): Promise<typeof import('mermaid').default> {
  if (!mermaidModule) {
    const mod = await import('mermaid')
    mermaidModule = mod.default
    const dark = !forceLight && window.matchMedia('(prefers-color-scheme: dark)').matches
    mermaidModule.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark ? 'dark' : 'default'
    })
  }
  return mermaidModule
}

/**
 * Rendert Mermaid-Quelltext zu SVG; wirft bei Syntaxfehlern.
 * forceLight erzwingt das helle Theme (PDF-Export); wirkt nur beim ersten
 * Aufruf im jeweiligen Fenster, da Mermaid einmalig initialisiert wird.
 */
export async function renderMermaid(code: string, forceLight = false): Promise<string> {
  const mermaid = await getMermaid(forceLight)
  counter += 1
  const { svg } = await mermaid.render(`merkzeug-mermaid-${counter}`, code)
  return svg
}

let mermaidModule: typeof import('mermaid').default | null = null
let counter = 0
let queue: Promise<unknown> = Promise.resolve()

/** Serialize initialization/rendering: print and editor calls can use different themes. */
export function renderMermaid(code: string, forceLight = false): Promise<string> {
  const render = queue.then(async () => {
    mermaidModule ??= (await import('mermaid')).default
    const dark = !forceLight && document.documentElement.dataset.theme === 'dark'
    mermaidModule.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default' })
    const { svg } = await mermaidModule.render(`merkzeug-mermaid-${++counter}`, code)
    return svg
  })
  queue = render.catch(() => {})
  return render
}

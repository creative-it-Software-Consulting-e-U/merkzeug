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

/** Parses a diagram without rendering; resolves with the error message or null when valid. */
export async function validateMermaid(code: string): Promise<string | null> {
  mermaidModule ??= (await import('mermaid')).default
  try {
    await mermaidModule.parse(code)
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return message.split('\n').filter((line) => line.trim()).slice(0, 4).join('\n')
  }
}

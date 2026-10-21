// IntelliJ renders JCEF off screen. On macOS, Chromium then receives these keys
// without the native editing commands that normally implement them, so the
// caret would not move. Handlers that already processed a key (CodeMirror
// blocks, ProseMirror node selections) prevent the default and are skipped.
type Step = ['backward' | 'forward', 'lineboundary' | 'documentboundary' | 'word']

function step(event: KeyboardEvent): Step | undefined {
  if (event.ctrlKey || event.metaKey === event.altKey) return
  const unit = event.metaKey ? 'lineboundary' : 'word'
  switch (event.key) {
    case 'ArrowLeft': case 'Backspace': return ['backward', unit]
    case 'ArrowRight': case 'Delete': return ['forward', unit]
    case 'ArrowUp': return event.metaKey ? ['backward', 'documentboundary'] : undefined
    case 'ArrowDown': return event.metaKey ? ['forward', 'documentboundary'] : undefined
  }
}

export function installMacNavigation(): void {
  if (!navigator.platform.startsWith('Mac')) return
  window.addEventListener('keydown', event => {
    const target = event.target as HTMLElement | null
    if (event.defaultPrevented || event.isComposing || !target?.isContentEditable) return
    const move = step(event)
    const selection = window.getSelection()
    if (!move || !selection) return
    const deleting = event.key === 'Backspace' || event.key === 'Delete'
    event.preventDefault()
    if (!deleting || selection.isCollapsed) selection.modify(deleting || event.shiftKey ? 'extend' : 'move', ...move)
    if (deleting && !selection.isCollapsed) document.execCommand('delete')
  })
}

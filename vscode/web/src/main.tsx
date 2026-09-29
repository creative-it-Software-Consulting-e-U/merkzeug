import '@merkzeug/ide/bridge'
import { mountIde } from '@merkzeug/ide'
import type { HostTheme } from '@merkzeug/editor/theme'

declare function acquireVsCodeApi(): { postMessage(message: unknown): void }
type HostMessage = { type: 'reply'; id: number; value: unknown; error?: string } | { type: 'changed' | 'print' | 'export' | 'settings' }

/** VS Code exposes its color theme as CSS variables; normalize them to the shared #rrggbb palette. */
function hostTheme(): HostTheme {
  const style = getComputedStyle(document.documentElement)
  const canvas = document.createElement('canvas').getContext('2d')!
  const parse = (value: string): number[] | undefined => {
    if (!value.trim()) return undefined
    canvas.fillStyle = '#010203'; canvas.fillStyle = value.trim()
    const normalized = String(canvas.fillStyle)
    if (normalized.startsWith('#')) return [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16)).concat(1)
    const parts = normalized.match(/[\d.]+/g)?.map(Number)
    return parts && parts.length >= 3 ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : undefined
  }
  const background = parse(style.getPropertyValue('--vscode-editor-background')) ?? [255, 255, 255, 1]
  const hex = (name: string): string | undefined => {
    const color = parse(style.getPropertyValue(name))
    if (!color) return undefined
    // Blend translucent theme colors over the editor background.
    return '#' + color.slice(0, 3).map((c, i) => Math.round(c * color[3] + background[i] * (1 - color[3])).toString(16).padStart(2, '0')).join('')
  }
  const classes = document.body.classList
  const colors: Record<string, string> = {}
  for (const [key, ...names] of [
    ['bg', '--vscode-editor-background'], ['bg-sidebar', '--vscode-sideBar-background', '--vscode-editorWidget-background'],
    ['bg-hover', '--vscode-list-hoverBackground', '--vscode-toolbar-hoverBackground'], ['bg-active', '--vscode-list-activeSelectionBackground'],
    ['text', '--vscode-editor-foreground'], ['text-dim', '--vscode-descriptionForeground'],
    ['border', '--vscode-panel-border', '--vscode-widget-border', '--vscode-editorGroup-border'], ['accent', '--vscode-textLink-foreground', '--vscode-focusBorder']
  ]) {
    const value = names.map(hex).find(Boolean)
    if (value) colors[key] = value
  }
  return { choice: 'system', dark: classes.contains('vscode-dark') || (classes.contains('vscode-high-contrast') && !classes.contains('vscode-high-contrast-light')), colors }
}

if (typeof acquireVsCodeApi === 'function') {
  const vscode = acquireVsCodeApi()
  window.__merkzeugSend = json => vscode.postMessage(json)
  window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
    const message = event.data
    if (message?.type === 'reply') window.__merkzeugReply(message.id, message.value, message.error)
    else if (message?.type === 'changed') window.__merkzeugChanged?.()
    else if (message?.type === 'print') window.dispatchEvent(new Event('merkzeug-print'))
    else if (message?.type === 'export') window.dispatchEvent(new Event('merkzeug-export'))
    else if (message?.type === 'settings') window.__merkzeugSettingsChanged?.()
  })
  // VS Code swaps body classes and variables when the color theme changes.
  new MutationObserver(() => window.__merkzeugTheme?.(hostTheme())).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-vscode-theme-id'] })
  const resources = document.querySelector<HTMLMetaElement>('meta[name=merkzeug-resources]')!.content
  mountIde({
    host: 'VS Code', edition: 'vscode', hostTheme,
    // localResourceRoots restrict these URLs to the workspace folder of the note.
    localImageUrl: absolute => resources + (absolute.startsWith('/') ? '' : '/') + absolute.split('/').map(encodeURIComponent).join('/')
  })
} else {
  // Headless Chromium renders `?pdf` through the same private-origin bridge as JCEF.
  mountIde({ host: 'VS Code', edition: 'vscode' })
}

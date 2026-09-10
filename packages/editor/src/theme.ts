export type ThemeChoice = 'system' | 'light' | 'dark'
export type HostTheme = { dark: boolean; choice?: ThemeChoice; colors?: Record<string, string> }
const key = 'merkzeug.theme'
let host: HostTheme | undefined
let started = false
let choiceOverride: ThemeChoice | undefined
export function themeChoice(): ThemeChoice {
  if (choiceOverride) return choiceOverride
  try { const value = localStorage.getItem(key); return value === 'light' || value === 'dark' ? value : 'system' } catch { return 'system' }
}
export function applyTheme(): void {
  const choice = themeChoice()
  const dark = choice === 'dark' || (choice === 'system' && (host?.dark ?? matchMedia('(prefers-color-scheme: dark)').matches))
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.colorScheme = dark ? 'dark' : 'light'
  for (const name of ['bg', 'bg-sidebar', 'bg-hover', 'bg-active', 'text', 'text-dim', 'border', 'accent']) {
    const value = choice === 'system' ? host?.colors?.[name] : undefined
    if (value && /^#[0-9a-f]{6}$/i.test(value)) root.style.setProperty(`--${name}`, value)
    else root.style.removeProperty(`--${name}`)
  }
  window.dispatchEvent(new Event('merkzeug-theme'))
}
export function setTheme(choice: ThemeChoice): void {
  if (themeChoice() === choice) return
  choiceOverride = choice
  try { localStorage.setItem(key, choice) } catch { /* Session-only environments still remain usable. */ }
  applyTheme()
  window.dispatchEvent(new CustomEvent('merkzeug-theme-choice', { detail: choice }))
}
export function setHostTheme(value: HostTheme): void { host = value; applyTheme() }
export function initializeTheme(): void {
  if (started) return
  started = true
  const initial = document.querySelector<HTMLMetaElement>('meta[name=merkzeug-host-theme]')?.content
  if (initial) { try { host = JSON.parse(atob(initial)) as HostTheme; choiceOverride = host.choice ?? 'system' } catch { /* Fall back to system appearance. */ } }
  applyTheme()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
  window.addEventListener('storage', event => { if (event.key === key) { choiceOverride = undefined; applyTheme() } })
}

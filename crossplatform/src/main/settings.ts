import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface SavedWindow {
  vault: string | null
  bounds: { x: number; y: number; width: number; height: number }
  maximized: boolean
  fullScreen: boolean
}

interface Settings {
  releaseNotesSeen?: string
  windows?: SavedWindow[]
  lastVault?: string
  recentVaults: string[]
  folderBookmarks?: Record<string, string>
  /** Ordner mit den PDF-Vorlagen (je Vorlage ein Unterordner) */
  templatesRoot?: string
}

let cache: Settings | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): Settings {
  if (cache) return cache
  try {
    cache = JSON.parse(readFileSync(settingsPath(), 'utf8'))
  } catch {
    cache = { recentVaults: [] }
  }
  if (!Array.isArray(cache!.recentVaults)) cache!.recentVaults = []
  return cache!
}

export function saveSettings(): void {
  if (!cache) return
  const p = settingsPath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(cache, null, 2))
}

export function getRecentVaults(): string[] {
  return loadSettings().recentVaults
}

export function addRecentVault(path: string): void {
  const s = loadSettings()
  s.recentVaults = [path, ...s.recentVaults.filter((p) => p !== path)].slice(0, 10)
  s.lastVault = path
  saveSettings()
}

export function getLastVault(): string | undefined {
  return loadSettings().lastVault
}

export function getStoredTemplatesRoot(): string | undefined {
  return loadSettings().templatesRoot
}

export function setStoredTemplatesRoot(path: string): void {
  loadSettings().templatesRoot = path
  saveSettings()
}

export function getSavedWindows(): SavedWindow[] {
  const windows = loadSettings().windows
  if (!Array.isArray(windows)) return []
  return windows.filter(w => w && (w.vault === null || typeof w.vault === 'string') &&
    w.bounds && ['x', 'y', 'width', 'height'].every(k => Number.isFinite(w.bounds[k as keyof SavedWindow['bounds']])) &&
    w.bounds.width >= 720 && w.bounds.height >= 480)
}

export function saveWindows(windows: SavedWindow[]): void {
  loadSettings().windows = windows
  saveSettings()
}

let releaseNotesClaimed = false
export function claimReleaseNotes(version: string): boolean {
  if (releaseNotesClaimed || loadSettings().releaseNotesSeen === version) return false
  releaseNotesClaimed = true
  return true
}
export function markReleaseNotesSeen(version: string): void {
  loadSettings().releaseNotesSeen = version
  saveSettings()
}

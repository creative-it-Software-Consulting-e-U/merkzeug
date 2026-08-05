import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

interface Settings {
  lastVault?: string
  recentVaults: string[]
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

function saveSettings(): void {
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

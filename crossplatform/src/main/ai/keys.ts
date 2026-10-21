/**
 * API keys of the AI assistant, encrypted with the OS keyring (Electron
 * safeStorage) in the user-data folder – never in settings.json.
 */
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type KeyProvider = 'anthropic' | 'openai'
type KeyFile = Partial<Record<KeyProvider, string>>

const keyPath = (): string => join(app.getPath('userData'), 'ai-keys.encrypted')

export function keyStorageAvailable(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false
  return !(process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
}

function readKeys(): KeyFile {
  if (!keyStorageAvailable() || !existsSync(keyPath())) return {}
  try {
    return JSON.parse(safeStorage.decryptString(readFileSync(keyPath()))) as KeyFile
  } catch {
    return {}
  }
}

function writeKeys(keys: KeyFile): void {
  if (!keyStorageAvailable()) throw new Error('A system keyring is required to store API keys.')
  const temporary = keyPath() + '.tmp'
  writeFileSync(temporary, safeStorage.encryptString(JSON.stringify(keys)), { mode: 0o600 })
  renameSync(temporary, keyPath())
}

export function getApiKey(provider: KeyProvider): string | undefined {
  const key = readKeys()[provider]?.trim()
  return key || undefined
}

export function hasApiKey(provider: KeyProvider): boolean {
  return Boolean(getApiKey(provider))
}

/** Empty key removes the entry. */
export function setApiKey(provider: KeyProvider, key: string): void {
  const keys = readKeys()
  if (key.trim()) keys[provider] = key.trim()
  else delete keys[provider]
  writeKeys(keys)
}

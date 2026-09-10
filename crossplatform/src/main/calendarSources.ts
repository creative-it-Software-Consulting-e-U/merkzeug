import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
const path = () => join(app.getPath('userData'), 'calendar-sources.encrypted')
function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('A system keyring is required to save private calendar subscriptions.')
}
export function loadCalendarSources(): string | null {
  if (!existsSync(path())) { const plain = path() + '.files'; return existsSync(plain) ? readFileSync(plain, 'utf8') : null }
  requireEncryption(); return safeStorage.decryptString(readFileSync(path()))
}
export function saveCalendarSources(value: string): void {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) {
    if (JSON.parse(value).some((source: { url?: string }) => source.url)) requireEncryption()
    writeFileSync(path() + '.files', value, { mode: 0o600 }); return
  }
  requireEncryption()
  const temporary = path() + '.tmp'
  writeFileSync(temporary, safeStorage.encryptString(value), { mode: 0o600 })
  renameSync(temporary, path())
  if (existsSync(path() + '.files')) unlinkSync(path() + '.files')
}
export async function fetchCalendarSource(raw: string): Promise<string> {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS subscription URL.')
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error('Calendar download failed.')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Empty calendar response.')
    const chunks: Uint8Array[] = []; let length = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      length += value.length
      if (length > 2_000_000) { await reader.cancel(); throw new Error('Calendar exceeds 2 MB.') }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } catch { throw new Error('Calendar download failed. Check the subscription URL and network connection.') }
}

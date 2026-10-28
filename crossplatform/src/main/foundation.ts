import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Node-API addon around macOS Foundation (resources/icloud), built by build-icloud-addon.py. */
export interface FoundationAddon {
  /** the edition's iCloud container, or null without iCloud */
  container(): Promise<string | null>
  /** the app's Application Scripts folder */
  scriptsFolder(): string | null
  /** runs a script there outside the App Sandbox; returns the caller's pipe ends */
  runScript(path: string, args: string[], done: (error: string | null) => void): { stdin: number; stdout: number; stderr: number }
}

let addon: FoundationAddon | null | undefined

export function foundationAddon(): FoundationAddon | null {
  if (addon !== undefined) return addon
  addon = null
  if (process.platform !== 'darwin') return addon
  const path = app.isPackaged ? join(process.resourcesPath, 'icloud/merkzeug-icloud.node') : join(__dirname, '../../resources/icloud/merkzeug-icloud.node')
  if (existsSync(path)) addon = require(path) as FoundationAddon
  return addon
}

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/** Install only a missing directory; never repair or overwrite a user's template. */
export function installTemplate(source: string, destination: string): boolean {
  if (existsSync(destination)) return false
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination, { recursive: true, force: false, errorOnExist: true })
  return true
}

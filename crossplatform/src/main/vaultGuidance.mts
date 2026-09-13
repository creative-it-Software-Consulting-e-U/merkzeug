import { constants, openSync, closeSync, readFileSync, writeSync, existsSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { instructionNames, type InstructionName } from '../../../packages/core/src/vaultGuidance.ts'
function target(root: string, name: InstructionName): string {
  if (!instructionNames.includes(name)) throw new Error('Only root AGENTS.md and CLAUDE.md are supported.')
  const path = join(realpathSync(root), name)
  if (existsSync(path) && realpathSync(path) !== path) throw new Error('Review symbolic links manually.')
  return path
}
export function readGuidance(root: string, name: InstructionName): string | null {
  const path = target(root, name)
  try { return readFileSync(path, 'utf8') } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
}
export function appendGuidance(root: string, name: InstructionName, expected: string | null, addition: string): void {
  const path = target(root, name)
  const fd = openSync(path, expected === null ? constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL : constants.O_RDWR | constants.O_APPEND | (constants.O_NOFOLLOW ?? 0), 0o644)
  try {
    if (expected !== null && readFileSync(fd, 'utf8') !== expected) throw new Error('Instructions changed externally. Review the refreshed preview before adding.')
    writeSync(fd, addition, undefined, 'utf8')
  } finally { closeSync(fd) }
}

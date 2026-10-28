/**
 * Shared helpers for the CLI backends: locating an executable (Electron apps
 * launched from the Finder/Dock get a minimal PATH) and running it with
 * line-based JSON output.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { AbortedError } from './provider'
import { bridgeRequired, bridgeState, startBridged, type BridgeTool, type CliProcess } from './scriptBridge'

let loginPath: string[] | null = null

/** PATH of the user's login shell (macOS/Linux), queried once. */
function loginShellPath(): string[] {
  if (loginPath) return loginPath
  loginPath = []
  if (process.platform === 'win32') return loginPath
  const shell = process.env.SHELL || '/bin/sh'
  try {
    const result = spawnSync(shell, ['-ilc', 'echo "$PATH"'], { encoding: 'utf8', timeout: 4000 })
    const out = (result.stdout || '').trim().split('\n').pop() ?? ''
    loginPath = out.split(delimiter).filter(Boolean)
  } catch {
    /* without a login shell only the fixed candidates remain */
  }
  return loginPath
}

function isExecutableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

/** First existing executable: fixed candidates, then PATH and the login-shell PATH. */
export function findExecutable(name: string, candidates: string[]): string | null {
  const home = homedir()
  const expanded = candidates.map((c) => c.replace(/^~(?=$|[/\\])/, home))
  const dirs = [
    ...(process.env.PATH ?? '').split(delimiter),
    ...loginShellPath(),
    join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin'
  ].filter(Boolean)
  const names = process.platform === 'win32' ? [`${name}.cmd`, `${name}.exe`, name] : [name]
  for (const path of expanded) if (isExecutableFile(path)) return path
  for (const dir of dirs) for (const n of names) if (isExecutableFile(join(dir, n))) return join(dir, n)
  return null
}

/** A CLI to run: its path, or in App Store builds a tool started by the Application Scripts launcher. */
export type CliCommand = { path: string } | { bridged: BridgeTool }

/** The command for `tool`, or null when it is not available (not found, or the launcher is not allowed yet). */
export function cliCommand(tool: BridgeTool, find: () => string | null): CliCommand | null {
  if (bridgeRequired()) return bridgeState() === 'ready' ? { bridged: tool } : null
  const path = find()
  return path ? { path } : null
}

export interface RunOptions {
  stdin: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  signal: AbortSignal
  /** called for every complete stdout line */
  onLine: (line: string) => void
}

/** Runs the executable, feeds stdin, streams stdout lines; rejects on abort or non-zero exit without `tolerated`. */
export function runLines(command: CliCommand, args: string[], options: RunOptions): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child: CliProcess
    try {
      child =
        'bridged' in command
          ? startBridged(command.bridged, options.cwd ?? '', args)
          : spawn(command.path, args, {
              cwd: options.cwd,
              env: options.env ?? process.env,
              windowsHide: true,
              shell: process.platform === 'win32' && /\.cmd$/i.test(command.path)
            })
    } catch (err) {
      reject(err)
      return
    }
    let buffer = ''
    let stderr = ''
    let settled = false
    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      options.signal.removeEventListener('abort', onAbort)
      fn()
    }
    const onAbort = (): void => {
      child.kill()
      finish(() => reject(new AbortedError()))
    }
    if (options.signal.aborted) return onAbort()
    options.signal.addEventListener('abort', onAbort)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let index: number
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '')
        buffer = buffer.slice(index + 1)
        if (line.trim()) options.onLine(line)
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
      if (stderr.length > 64_000) stderr = stderr.slice(-64_000)
    })
    child.on('error', (err) => finish(() => reject(err)))
    child.on('close', (code) => {
      if (buffer.trim()) options.onLine(buffer)
      finish(() => resolve({ code, stderr }))
    })
    child.stdin.on('error', () => {
      /* the process may exit before reading stdin */
    })
    child.stdin.end(options.stdin)
  })
}

/** Short, user-facing excerpt of a CLI's stderr. */
export function stderrExcerpt(stderr: string): string {
  const lines = stderr
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^warning: no stdin/i.test(l))
  return lines.slice(-3).join(' ').slice(0, 400)
}

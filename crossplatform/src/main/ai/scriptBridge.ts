/**
 * App Store builds run in the App Sandbox: CLIs in the home folder are
 * invisible, and child processes inherit the sandbox, so Claude Code and
 * Codex cannot reach their own login. macOS runs scripts the user saved in
 * the app's Application Scripts folder outside the sandbox (NSUserUnixTask),
 * so Merkzeug asks once to save a small launcher there.
 */
import { t } from '@merkzeug/core/i18n'
import { BrowserWindow, dialog } from 'electron'
import { EventEmitter } from 'node:events'
import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import { Socket } from 'node:net'
import { join, resolve } from 'node:path'
import type { Readable, Writable } from 'node:stream'
import { foundationAddon } from '../foundation'

export type BridgeTool = 'claude' | 'codex'
export type BridgeState = 'missing' | 'outdated' | 'ready'

const SCRIPT_NAME = 'merkzeug-cli'

/** Changing this text asks users to renew their approval. */
export const BRIDGE_SCRIPT = `#!/bin/sh
# Merkzeug CLI launcher 1
# Lets Merkzeug from the App Store start Claude Code or Codex outside its
# sandbox, with their own login. Delete this file to revoke the approval.
tool="$1"
# launched without a login session: the CLIs look up their login by user name
USER="\${USER:-$(id -un)}"
LOGNAME="\${LOGNAME:-$USER}"
HOME="\${HOME:-$(dscl . -read "/Users/$USER" NFSHomeDirectory 2>/dev/null | sed 's/^NFSHomeDirectory: //')}"
export USER LOGNAME HOME
case "$tool" in
  claude) extra="$HOME/.claude/local/claude" ;;
  codex) extra="/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex $HOME/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex" ;;
  *) echo "Merkzeug: unsupported tool: $tool" >&2; exit 64 ;;
esac
find_tool() {
  command -v "$tool" 2>/dev/null && return
  for candidate in $extra; do
    if [ -x "$candidate" ]; then echo "$candidate"; return; fi
  done
}
PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
bin=$(find_tool)
if [ -z "$bin" ]; then
  login=$(dscl . -read "/Users/$USER" UserShell 2>/dev/null | sed 's/^UserShell: //')
  PATH="$("\${login:-/bin/zsh}" -ilc 'echo "$PATH"' </dev/null 2>/dev/null | tail -n 1):$PATH"
  bin=$(find_tool)
fi
export PATH
if [ -z "$bin" ]; then echo "Merkzeug: $tool not found" >&2; exit 127; fi
if [ "$2" = "--which" ]; then echo "$bin"; exit 0; fi
dir="$2"
shift 2
for arg in "$@"; do
  case "$arg" in
    --dangerously-*|--yolo) echo "Merkzeug: refused option $arg" >&2; exit 64 ;;
  esac
done
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT
if [ -n "$dir" ]; then cd "$dir" || exit 66; fi
exec "$bin" "$@"
`

/** Whether CLIs must be started through the launcher (App Store builds; MERKZEUG_CLI_BRIDGE=1 for tests). */
export function bridgeRequired(): boolean {
  return Boolean(process.mas) || process.env.MERKZEUG_CLI_BRIDGE === '1'
}

function scriptPath(): string | null {
  const folder = foundationAddon()?.scriptsFolder()
  return folder ? join(folder, SCRIPT_NAME) : null
}

export function bridgeState(): BridgeState {
  const path = scriptPath()
  if (!path) return 'missing'
  try {
    return readFileSync(path, 'utf8') === BRIDGE_SCRIPT ? 'ready' : 'outdated'
  } catch {
    return 'missing'
  }
}

const found = new Map<BridgeTool, { at: number; path: Promise<string | null> }>()

/** Path of the tool as the launcher sees it, or null; cached briefly. */
export function bridgedToolPath(tool: BridgeTool): Promise<string | null> {
  const cached = found.get(tool)
  if (cached && Date.now() - cached.at < 30_000) return cached.path
  const path = new Promise<string | null>((done) => {
    let output = ''
    try {
      const child = startBridged(tool, '', [], true)
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => (output += chunk))
      child.stderr.resume()
      child.stdin.end()
      child.on('close', (code: number | null) => done(code === 0 ? output.trim() || null : null))
      child.on('error', () => done(null))
    } catch {
      done(null)
    }
  })
  found.set(tool, { at: Date.now(), path })
  return path
}

/** Shows a save panel on the scripts folder; macOS only lets the user put the launcher there. */
export async function installBridge(win: BrowserWindow | null): Promise<void> {
  const path = scriptPath()
  if (!path) throw new Error(t('The Application Scripts folder is not available.'))
  const options: Electron.SaveDialogOptions = {
    title: t('Allow Claude Code and Codex'),
    message: t('Save this launcher without changing its name or folder. Merkzeug can then start Claude Code and Codex with their own login. Delete the file to revoke this.'),
    defaultPath: path,
    buttonLabel: t('Allow')
  }
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return
  if (resolve(result.filePath) !== resolve(path)) throw new Error(t('Please keep the suggested name and folder.'))
  writeFileSync(result.filePath, BRIDGE_SCRIPT, { mode: 0o755 })
  chmodSync(result.filePath, 0o755)
  found.clear()
}

export interface CliProcess extends EventEmitter {
  stdin: Writable
  stdout: Readable
  stderr: Readable
  kill(): void
}

/**
 * Starts the tool through the launcher in `cwd`. It cannot be killed from the
 * sandbox; closing the pipes ends it at its next write.
 */
export function startBridged(tool: BridgeTool, cwd: string, args: string[], which = false): CliProcess {
  const native = foundationAddon()
  const path = scriptPath()
  if (!native || !path) throw new Error(t('The Application Scripts folder is not available.'))
  const child = new EventEmitter() as CliProcess
  let exit: number | null | undefined
  let open = 2
  const finish = (): void => {
    if (exit !== undefined && open === 0) child.emit('close', exit)
  }
  const fds = native.runScript(path, which ? [tool, '--which'] : [tool, cwd, ...args], (error) => {
    exit = error ? Number(/status (\d+)/.exec(error)?.[1] ?? 1) : 0
    finish()
  })
  child.stdin = new Socket({ fd: fds.stdin, readable: false, writable: true })
  child.stdout = new Socket({ fd: fds.stdout, readable: true, writable: false })
  child.stderr = new Socket({ fd: fds.stderr, readable: true, writable: false })
  child.stdin.on('error', () => {
    /* the tool may exit before reading stdin */
  })
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('close', () => {
      open--
      finish()
    })
    stream.on('error', (err) => child.emit('error', err))
  }
  child.kill = () => {
    for (const stream of [child.stdin, child.stdout, child.stderr]) stream.destroy()
  }
  return child
}

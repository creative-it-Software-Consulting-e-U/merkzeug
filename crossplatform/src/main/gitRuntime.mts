import { execFile } from 'node:child_process'
import { access, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

export interface CommandResult { code: number; out: string; errorCode?: string }
export interface GitAvailability { path?: string; reason?: 'missing' | 'unusable' }
type Run = (file: string, args: string[], cwd?: string) => Promise<CommandResult>

const runCommand: Run = (file, args, cwd) => new Promise(resolve => {
  execFile(file, args, { cwd, timeout: args[0] === '--version' || file === '/usr/bin/xcode-select' ? 5000 : 60000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (error, stdout, stderr) => {
    const code = (error as { code?: unknown } | null)?.code
    resolve({ code: error ? typeof code === 'number' ? code : 1 : 0,
      out: `${stdout}${stderr}`.trimEnd(), errorCode: typeof code === 'string' ? code : undefined })
  })
})

/** Resolve real Git binaries; never invoke macOS's install-on-demand shim. */
export function createGitRuntime(options: {
  platform?: string; path?: string; run?: Run;
  executable?: (path: string) => Promise<string | null>
} = {}) {
  const platform = options.platform ?? process.platform
  const run = options.run ?? runCommand
  const executable = options.executable ?? (async (path: string) => {
    try { await access(path, constants.X_OK); return await realpath(path) } catch { return null }
  })
  let cached: Promise<GitAvailability> | undefined
  async function discover(): Promise<GitAvailability> {
    const folders = (options.path ?? process.env.PATH ?? '').split(platform === 'win32' ? ';' : ':').filter(Boolean)
    if (platform === 'darwin') folders.push('/opt/homebrew/bin', '/usr/local/bin', '/usr/bin')
    const candidates = [...new Set(folders.map(folder => join(folder, platform === 'win32' ? 'git.exe' : 'git')))]
    let unusable = false
    for (const candidate of candidates) {
      let binary = await executable(candidate)
      if (!binary) continue
      if (platform === 'darwin' && (candidate === '/usr/bin/git' || binary === '/usr/bin/git')) {
        // This query does not run a developer tool or trigger installation.
        const selected = await run('/usr/bin/xcode-select', ['--print-path'])
        if (selected.code !== 0 || !selected.out.startsWith('/')) continue
        binary = await executable(join(selected.out.trim(), 'usr/bin/git'))
        if (!binary || binary === '/usr/bin/git') continue
      }
      const version = await run(binary, ['--version'])
      if (version.code === 0 && /^git version\s/.test(version.out)) return { path: binary }
      unusable = true
    }
    return { reason: unusable ? 'unusable' : 'missing' }
  }
  function availability(): Promise<GitAvailability> { return cached ??= discover() }
  return {
    availability,
    retry() { cached = undefined },
    async command(cwd: string, args: string[]): Promise<CommandResult> {
      const found = await availability()
      if (!found.path) return { code: 1, out: 'Git is unavailable.', errorCode: 'GIT_UNAVAILABLE' }
      const result = await run(found.path, args, cwd)
      if (result.errorCode === 'ENOENT' || result.errorCode === 'EACCES') {
        cached = Promise.resolve({ reason: result.errorCode === 'ENOENT' ? 'missing' : 'unusable' })
        return { ...result, errorCode: 'GIT_UNAVAILABLE' }
      }
      return result
    }
  }
}

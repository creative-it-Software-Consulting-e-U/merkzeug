import { execFile } from 'node:child_process'
import type { GitResult, GitStatus } from '../shared/types'

function git(vault: string, args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolvePromise) => {
    execFile(
      'git',
      args,
      { cwd: vault, timeout: 60_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
      (error, stdout, stderr) => {
        const rawCode = error ? (error as { code?: unknown }).code : 0
        const code = typeof rawCode === 'number' ? rawCode : error ? 1 : 0
        resolvePromise({ code, out: `${stdout}${stderr}`.trim() })
      }
    )
  })
}

export async function gitStatus(vault: string): Promise<GitStatus> {
  const inside = await git(vault, ['rev-parse', '--is-inside-work-tree'])
  if (inside.code !== 0 || inside.out !== 'true') {
    return { isRepo: false, ahead: 0, behind: 0, hasRemote: false, changes: [] }
  }
  const branch = (await git(vault, ['rev-parse', '--abbrev-ref', 'HEAD'])).out
  const remotes = (await git(vault, ['remote'])).out
  const hasRemote = remotes.length > 0
  let ahead = 0
  let behind = 0
  if (hasRemote) {
    const counts = await git(vault, ['rev-list', '--left-right', '--count', '@{u}...HEAD'])
    if (counts.code === 0) {
      const [behindStr, aheadStr] = counts.out.split(/\s+/)
      behind = parseInt(behindStr, 10) || 0
      ahead = parseInt(aheadStr, 10) || 0
    }
  }
  const status = await git(vault, ['status', '--porcelain'])
  const changes = status.out
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ code: line.slice(0, 2), path: line.slice(3).replace(/^"|"$/g, '') }))
  return { isRepo: true, branch, ahead, behind, hasRemote, changes }
}

async function doPush(vault: string, remotes: string): Promise<GitResult> {
  let push = await git(vault, ['push'])
  if (push.code !== 0 && /no upstream|--set-upstream/i.test(push.out)) {
    const branch = (await git(vault, ['rev-parse', '--abbrev-ref', 'HEAD'])).out
    const remote = remotes.split('\n')[0].trim()
    push = await git(vault, ['push', '-u', remote, branch])
  }
  return { ok: push.code === 0, output: push.out }
}

export async function gitCommitPush(vault: string, message: string): Promise<GitResult> {
  const add = await git(vault, ['add', '-A'])
  if (add.code !== 0) return { ok: false, output: add.out }
  const status = await git(vault, ['status', '--porcelain'])
  if (status.out.trim().length > 0) {
    const commit = await git(vault, ['commit', '-m', message])
    if (commit.code !== 0) return { ok: false, output: commit.out }
  }
  const remotes = (await git(vault, ['remote'])).out
  if (remotes.length === 0) return { ok: true, output: 'Commit erstellt (kein Remote zum Pushen).' }
  return doPush(vault, remotes)
}

/** Nur pushen, ohne neuen Commit — um einen fehlgeschlagenen Push nachzuholen. */
export async function gitPush(vault: string): Promise<GitResult> {
  const remotes = (await git(vault, ['remote'])).out
  if (remotes.length === 0) return { ok: false, output: 'Kein Remote zum Pushen konfiguriert.' }
  return doPush(vault, remotes)
}

export async function gitPull(vault: string): Promise<GitResult> {
  const pull = await git(vault, ['pull'])
  return { ok: pull.code === 0, output: pull.out }
}

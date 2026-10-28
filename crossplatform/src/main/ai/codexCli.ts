/**
 * OpenAI Codex CLI (`codex exec`): uses the ChatGPT login of the Codex CLI or
 * of the ChatGPT desktop app, which bundles the CLI – Merkzeug never sees it.
 * Codex is an agent with tools. Without vault access it runs read-only in an
 * empty temp folder; with access the vault is its working directory, and the
 * sandbox allows writes there only when editing is allowed.
 */
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { foldedPrompt } from './prompt'
import { cliCommand, findExecutable, runLines, stderrExcerpt } from './cli'
import type { AiProvider, ProviderRequest, ProviderResult } from './provider'

export function findCodexCli(): string | null {
  return findExecutable('codex', [
    '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
    '~/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
    '~/.local/bin/codex'
  ])
}

interface JsonLine {
  type?: string
  item?: { type?: string; text?: string; command?: string; changes?: { path?: string; kind?: string }[] }
  error?: { message?: string } | string
  message?: string
}

export const codexCliProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const command = cliCommand('codex', findCodexCli)
    if (!command) throw new Error('Codex CLI not found.')
    const vault = request.vault
    let cwd = vault?.session.root
    if (!cwd) {
      cwd = join(tmpdir(), 'merkzeug-ai-codex')
      mkdirSync(cwd, { recursive: true })
    }
    const sandbox = vault?.session.access === 'write' ? 'workspace-write' : 'read-only'
    const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', sandbox, '--ephemeral', '--color', 'never', '-C', cwd]
    if (request.model) args.push('-m', request.model)
    args.push('-')
    const answers: string[] = []
    let errorText: string | null = null
    const { code, stderr } = await runLines(command, args, {
      stdin: foldedPrompt(request.messages, request.context, true, vault?.cliInstructions),
      cwd,
      signal,
      onLine: (line) => {
        let data: JsonLine
        try {
          data = JSON.parse(line) as JsonLine
        } catch {
          return
        }
        if (data.type === 'item.completed' && data.item?.type === 'agent_message' && data.item.text) {
          answers.push(data.item.text)
          onDelta((answers.length > 1 ? '\n\n' : '') + data.item.text)
        } else if (data.type === 'item.completed' && vault && data.item?.type === 'command_execution' && data.item.command) {
          vault.report({ kind: 'search', path: '/', detail: data.item.command.slice(0, 200) })
        } else if (data.type === 'item.completed' && vault && data.item?.type === 'file_change') {
          for (const change of data.item.changes ?? []) {
            if (change.path) vault.report({ kind: 'write', path: vault.session.relativePath(change.path), detail: change.kind })
          }
        } else if (data.type === 'turn.failed' || data.type === 'error') {
          const err = data.error
          errorText = (typeof err === 'string' ? err : err?.message) || data.message || 'Codex reported an error.'
        }
      }
    })
    if (errorText) throw new Error(errorText)
    if (answers.length === 0) {
      throw new Error(stderrExcerpt(stderr) || `Codex exited with code ${code ?? '?'} without an answer.`)
    }
    // the last message is the answer; earlier ones are progress notes
    return { text: answers[answers.length - 1], model: request.model || undefined }
  }
}

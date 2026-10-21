/**
 * OpenAI Codex CLI (`codex exec`): uses the ChatGPT login of the Codex CLI or
 * of the ChatGPT desktop app, which bundles the CLI – Merkzeug never sees it.
 * Codex is an agent with tools; it runs read-only in an empty temp folder so
 * it can neither read the vault nor change anything.
 */
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { foldedPrompt } from './prompt'
import { findExecutable, runLines, stderrExcerpt } from './cli'
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
  item?: { type?: string; text?: string }
  error?: { message?: string } | string
  message?: string
}

export const codexCliProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const file = findCodexCli()
    if (!file) throw new Error('Codex CLI not found.')
    const cwd = join(tmpdir(), 'merkzeug-ai-codex')
    mkdirSync(cwd, { recursive: true })
    const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only', '--ephemeral', '--color', 'never', '-C', cwd]
    if (request.model) args.push('-m', request.model)
    args.push('-')
    const answers: string[] = []
    let errorText: string | null = null
    const { code, stderr } = await runLines(file, args, {
      stdin: foldedPrompt(request.messages, request.context, true),
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
    return { text: answers.join('\n\n'), model: request.model || undefined }
  }
}

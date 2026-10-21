/**
 * Claude Code CLI in headless mode (`claude -p`): uses whatever login the
 * user has in Claude Code (subscription or API key) – Merkzeug never sees it.
 */
import { foldedPrompt, STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { findExecutable, runLines, stderrExcerpt } from './cli'
import type { AiProvider, ProviderRequest, ProviderResult } from './provider'

export function findClaudeCli(): string | null {
  return findExecutable('claude', ['~/.local/bin/claude', '~/.claude/local/claude'])
}

interface StreamLine {
  type?: string
  event?: { type?: string; delta?: { type?: string; text?: string } }
  result?: string
  is_error?: boolean
  subtype?: string
  message?: { model?: string }
}

export const claudeCliProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const file = findClaudeCli()
    if (!file) throw new Error('Claude Code CLI not found.')
    const context = contextBlock(request.context)
    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--tools', '',
      '--no-session-persistence',
      '--system-prompt', context ? `${STABLE_INSTRUCTIONS}\n\n${context}` : STABLE_INSTRUCTIONS
    ]
    if (request.model) args.push('--model', request.model)
    // nested runs (Merkzeug started from a Claude Code session) are refused otherwise
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.CLAUDE_CODE_ENTRYPOINT
    let streamed = ''
    let result: string | null = null
    let errorText: string | null = null
    let model: string | undefined
    const { code, stderr } = await runLines(file, args, {
      stdin: foldedPrompt(request.messages, request.context, false),
      env,
      signal,
      onLine: (line) => {
        let data: StreamLine
        try {
          data = JSON.parse(line) as StreamLine
        } catch {
          return
        }
        if (data.type === 'stream_event' && data.event?.type === 'content_block_delta' && data.event.delta?.type === 'text_delta') {
          const text = data.event.delta.text ?? ''
          streamed += text
          onDelta(text)
        } else if (data.type === 'assistant') {
          model ??= data.message?.model
        } else if (data.type === 'result') {
          if (data.is_error) errorText = data.result || data.subtype || 'Claude Code reported an error.'
          else result = data.result ?? streamed
        }
      }
    })
    if (errorText) throw new Error(errorText)
    if (result === null) {
      throw new Error(stderrExcerpt(stderr) || `Claude Code exited with code ${code ?? '?'} without an answer.`)
    }
    return { text: result, model }
  }
}

/**
 * Claude Code CLI in headless mode (`claude -p`): uses whatever login the
 * user has in Claude Code (subscription or API key) – Merkzeug never sees it.
 * Without vault access it runs without tools; with access it works in the
 * vault folder with only Read/Glob/Grep (plus Edit/Write when editing is
 * allowed, auto-accepted inside the vault only).
 */
import { isAbsolute, relative } from 'node:path'
import { foldedPrompt, STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { cliCommand, findExecutable, runLines, stderrExcerpt } from './cli'
import type { AiProvider, ProviderRequest, ProviderResult } from './provider'
import type { VaultActivity } from './vaultTools'

export function findClaudeCli(): string | null {
  return findExecutable('claude', ['~/.local/bin/claude', '~/.claude/local/claude'])
}

interface ContentBlock {
  type?: string
  id?: string
  name?: string
  input?: { file_path?: string; path?: string; pattern?: string }
  tool_use_id?: string
  is_error?: boolean
}

interface StreamLine {
  type?: string
  event?: { type?: string; delta?: { type?: string; text?: string } }
  result?: string
  is_error?: boolean
  subtype?: string
  message?: { model?: string; content?: ContentBlock[] | string }
}

const ACTIVITY: Record<string, VaultActivity['kind']> = { Read: 'read', Glob: 'list', Grep: 'search', Edit: 'write', Write: 'write' }

export const claudeCliProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const command = cliCommand('claude', findClaudeCli)
    if (!command) throw new Error('Claude Code CLI not found.')
    const vault = request.vault
    const system = [STABLE_INSTRUCTIONS, vault?.cliInstructions, contextBlock(request.context)].filter(Boolean).join('\n\n')
    const write = vault?.session.access === 'write'
    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--tools', vault ? (write ? 'Read,Glob,Grep,Edit,Write' : 'Read,Glob,Grep') : '',
      // acceptEdits: edits inside the working directory only; everything else is denied in -p mode
      '--permission-mode', write ? 'acceptEdits' : 'default',
      '--no-session-persistence',
      '--system-prompt', system
    ]
    if (request.model) args.push('--model', request.model)
    // nested runs (Merkzeug started from a Claude Code session) are refused otherwise
    const env = { ...process.env }
    delete env.CLAUDECODE
    delete env.CLAUDE_CODE_ENTRYPOINT
    const root = vault?.session.root
    const shown = (path: string | undefined): string => {
      if (!path || !root) return path ?? ''
      const rel = relative(root, path)
      return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.split('\\').join('/') : path
    }
    const pending = new Map<string, { kind: VaultActivity['kind']; path: string; detail?: string }>()
    let streamed = ''
    let result: string | null = null
    let errorText: string | null = null
    let model: string | undefined
    const { code, stderr } = await runLines(command, args, {
      stdin: foldedPrompt(request.messages, request.context, false),
      cwd: root,
      env,
      signal,
      onLine: (line) => {
        let data: StreamLine
        try {
          data = JSON.parse(line) as StreamLine
        } catch {
          return
        }
        const content = Array.isArray(data.message?.content) ? data.message.content : []
        if (data.type === 'stream_event' && data.event?.type === 'content_block_delta' && data.event.delta?.type === 'text_delta') {
          const text = data.event.delta.text ?? ''
          streamed += text
          onDelta(text)
        } else if (data.type === 'assistant') {
          model ??= data.message?.model
          for (const block of content) {
            const kind = block.type === 'tool_use' && block.name ? ACTIVITY[block.name] : undefined
            if (kind && block.id) {
              pending.set(block.id, { kind, path: shown(block.input?.file_path ?? block.input?.path) || '/', detail: block.input?.pattern })
            }
          }
        } else if (data.type === 'user') {
          // tool results: report what actually ran, and denials (e.g. paths outside the vault)
          for (const block of content) {
            const use = block.type === 'tool_result' && block.tool_use_id ? pending.get(block.tool_use_id) : undefined
            if (!use || !vault || use.kind === 'needsWrite') continue
            pending.delete(block.tool_use_id!)
            vault.report(block.is_error ? { kind: 'denied', path: use.path, detail: use.detail } : { kind: use.kind, path: use.path, detail: use.detail })
          }
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

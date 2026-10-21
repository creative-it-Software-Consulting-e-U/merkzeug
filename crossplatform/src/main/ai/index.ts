/**
 * AI assistant: dispatches chat requests from the panel to the configured
 * backend and streams the answer back to the requesting window.
 */
import type { WebContents } from 'electron'
import { existsSync } from 'node:fs'
import { parseToolCall, stripNeedsWrite, vaultInstructions, vaultToolSpecs, type VaultAccess } from '@merkzeug/core/assistantTools'
import type { AiChatEvent, AiChatRequest, AiProviderId, AiProviderStatus, AiSettings, AiStatus, AiUndoResult } from '../../shared/types'
import { getAiSettings, setAiSettings } from '../settings'
import { isIgnoredDir } from '../ignore'
import { anthropicProvider, listAnthropicModels } from './anthropic'
import { openaiProvider, listOpenAiModels } from './openai'
import { claudeCliProvider, findClaudeCli } from './claudeCli'
import { codexCliProvider, findCodexCli } from './codexCli'
import { hasApiKey, keyStorageAvailable, setApiKey } from './keys'
import { AbortedError, type AiProvider, type VaultHost } from './provider'
import { VaultSession, type FileChange } from './vaultTools'

const providers: Record<AiProviderId, AiProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  'claude-cli': claudeCliProvider,
  'codex-cli': codexCliProvider
}

const running = new Map<string, AbortController>()
/** sessions of answers that changed files, for undo (newest last) */
const undoable = new Map<string, VaultSession>()
const MAX_UNDOABLE = 20

export function aiStatus(): AiStatus {
  const claude = findClaudeCli()
  const codex = findCodexCli()
  const list: AiProviderStatus[] = [
    { id: 'anthropic', ready: hasApiKey('anthropic'), detail: hasApiKey('anthropic') ? 'API key stored' : 'No API key stored' },
    { id: 'openai', ready: hasApiKey('openai'), detail: hasApiKey('openai') ? 'API key stored' : 'No API key stored' },
    { id: 'claude-cli', ready: Boolean(claude), detail: claude ?? 'Not found' },
    { id: 'codex-cli', ready: Boolean(codex), detail: codex ?? 'Not found' }
  ]
  return { settings: getAiSettings(), providers: list, keyStorage: keyStorageAvailable() }
}

export function saveAiSettings(settings: AiSettings): AiStatus {
  setAiSettings(settings)
  return aiStatus()
}

export function saveAiKey(provider: 'anthropic' | 'openai', key: string): AiStatus {
  setApiKey(provider, key)
  return aiStatus()
}

export function listAiModels(provider: AiProviderId): Promise<string[]> {
  if (provider === 'anthropic') return listAnthropicModels()
  if (provider === 'openai') return listOpenAiModels()
  return Promise.resolve([])
}

function vaultHost(session: VaultSession, report: VaultHost['report']): VaultHost {
  return {
    session,
    specs: vaultToolSpecs(session.access),
    toolInstructions: vaultInstructions(session.access, 'tools'),
    cliInstructions: vaultInstructions(session.access, 'cli'),
    report,
    run: async (name, input) => {
      const call = parseToolCall(name, input)
      if ('error' in call) {
        report({ kind: 'denied', path: '', detail: call.error })
        return { content: call.error, isError: true }
      }
      try {
        return await session.run(call, report)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        report({ kind: 'denied', path: 'path' in call ? call.path : '', detail: message })
        return { content: message, isError: true }
      }
    }
  }
}

/** Starts a chat; progress arrives as 'ai:event' messages on the sender. Resolves when finished. */
export async function startAiChat(sender: WebContents, request: AiChatRequest, vaultRoot: string | null): Promise<void> {
  const settings = getAiSettings()
  const send = (event: AiChatEvent): void => {
    if (!sender.isDestroyed()) sender.send('ai:event', event)
  }
  const provider = settings.provider
  if (!provider) {
    send({ id: request.id, type: 'error', message: 'No AI provider configured.' })
    return
  }
  const access: VaultAccess = vaultRoot && existsSync(vaultRoot) && settings.vaultRead ? (request.vaultAccess ?? 'none') : 'none'
  const session = access === 'none' || !vaultRoot ? null : new VaultSession(vaultRoot, access, isIgnoredDir)
  let needsWrite: string | undefined
  const vault = session
    ? vaultHost(session, (activity) => {
        if (activity.kind === 'needsWrite') needsWrite = activity.detail
        send({ id: request.id, type: 'activity', activity })
      })
    : null
  // CLIs write on their own; a snapshot before the run makes their changes undoable
  const cli = provider === 'claude-cli' || provider === 'codex-cli'
  if (session && access === 'write' && cli) session.takeSnapshot()
  const controller = new AbortController()
  running.get(request.id)?.abort()
  running.set(request.id, controller)
  const finishChanges = (): { changes?: FileChange[]; undoComplete?: boolean } => {
    if (!session) return {}
    if (cli && access === 'write') session.collectSnapshotChanges()
    const changes = session.changeList()
    if (changes.length === 0) return {}
    undoable.delete(request.id)
    undoable.set(request.id, session)
    while (undoable.size > MAX_UNDOABLE) undoable.delete(undoable.keys().next().value!)
    return { changes, undoComplete: session.undoComplete }
  }
  try {
    const result = await providers[provider].chat(
      { messages: request.messages, context: request.context, model: settings.models[provider]?.trim() ?? '', vault },
      controller.signal,
      (text) => send({ id: request.id, type: 'delta', text })
    )
    const { text, needsWrite: marked } = stripNeedsWrite(result.text)
    if (marked && access === 'read') needsWrite ??= ''
    send({ id: request.id, type: 'done', text, model: result.model, ...finishChanges(), ...(needsWrite !== undefined && access === 'read' ? { needsWrite } : {}) })
  } catch (err) {
    const changes = finishChanges()
    if (err instanceof AbortedError || controller.signal.aborted) {
      send({ id: request.id, type: 'done', text: '', ...changes })
    } else {
      send({ id: request.id, type: 'error', message: errorMessage(err), changes: changes.changes })
    }
  } finally {
    if (running.get(request.id) === controller) running.delete(request.id)
  }
}

/** Restores the files an answer changed (unless they were changed again since). */
export function undoAiChanges(id: string): AiUndoResult {
  const session = undoable.get(id)
  if (!session) return { restored: [], skipped: [] }
  undoable.delete(id)
  return session.undo()
}

export function cancelAiChat(id: string): void {
  running.get(id)?.abort()
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { status?: number; message?: string; error?: { error?: { message?: string } } }
    const nested = e.error?.error?.message
    if (nested) return e.status ? `${nested} (HTTP ${e.status})` : nested
    if (e.message) return e.message
  }
  return String(err)
}

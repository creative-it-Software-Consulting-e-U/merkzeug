/**
 * AI assistant: dispatches chat requests from the panel to the configured
 * backend and streams the answer back to the requesting window.
 */
import type { WebContents } from 'electron'
import type { AiChatEvent, AiChatRequest, AiProviderId, AiProviderStatus, AiSettings, AiStatus } from '../../shared/types'
import { getAiSettings, setAiSettings } from '../settings'
import { anthropicProvider, listAnthropicModels } from './anthropic'
import { openaiProvider, listOpenAiModels } from './openai'
import { claudeCliProvider, findClaudeCli } from './claudeCli'
import { codexCliProvider, findCodexCli } from './codexCli'
import { hasApiKey, keyStorageAvailable, setApiKey } from './keys'
import { AbortedError, type AiProvider } from './provider'

const providers: Record<AiProviderId, AiProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  'claude-cli': claudeCliProvider,
  'codex-cli': codexCliProvider
}

const running = new Map<string, AbortController>()

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

/** Starts a chat; progress arrives as 'ai:event' messages on the sender. Resolves when finished. */
export async function startAiChat(sender: WebContents, request: AiChatRequest): Promise<void> {
  const settings = getAiSettings()
  const send = (event: AiChatEvent): void => {
    if (!sender.isDestroyed()) sender.send('ai:event', event)
  }
  const provider = settings.provider
  if (!provider) {
    send({ id: request.id, type: 'error', message: 'No AI provider configured.' })
    return
  }
  const controller = new AbortController()
  running.get(request.id)?.abort()
  running.set(request.id, controller)
  try {
    const result = await providers[provider].chat(
      { messages: request.messages, context: request.context, model: settings.models[provider]?.trim() ?? '' },
      controller.signal,
      (text) => send({ id: request.id, type: 'delta', text })
    )
    send({ id: request.id, type: 'done', text: result.text, model: result.model })
  } catch (err) {
    if (err instanceof AbortedError || controller.signal.aborted) {
      send({ id: request.id, type: 'done', text: '' })
    } else {
      send({ id: request.id, type: 'error', message: errorMessage(err) })
    }
  } finally {
    if (running.get(request.id) === controller) running.delete(request.id)
  }
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

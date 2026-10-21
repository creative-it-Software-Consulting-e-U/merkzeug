/** Anthropic API (Claude) with a stored API key – pay-as-you-go, no subscription. */
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from './keys'
import { STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { AbortedError, type AiProvider, type ProviderRequest, type ProviderResult } from './provider'

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5'

export const anthropicProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const apiKey = getApiKey('anthropic')
    if (!apiKey) throw new Error('No Anthropic API key stored.')
    const client = new Anthropic({ apiKey })
    const context = contextBlock(request.context)
    const stream = client.beta.messages.stream(
      {
        model: request.model || ANTHROPIC_DEFAULT_MODEL,
        max_tokens: 16000,
        // Safety-classifier declines are re-run on a fallback model server-side.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [
          { type: 'text', text: STABLE_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
          ...(context ? [{ type: 'text' as const, text: context }] : [])
        ],
        messages: request.messages.map((m) => ({ role: m.role, content: m.content }))
      },
      { signal }
    )
    stream.on('text', (delta) => onDelta(delta))
    try {
      const message = await stream.finalMessage()
      if (message.stop_reason === 'refusal') {
        throw new Error(message.stop_details?.explanation || 'The model declined this request.')
      }
      const text = message.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
      return { text, model: message.model }
    } catch (err) {
      if (signal.aborted) throw new AbortedError()
      throw err
    }
  }
}

/** Model ids for the settings dropdown (requires a stored key). */
export async function listAnthropicModels(): Promise<string[]> {
  const apiKey = getApiKey('anthropic')
  if (!apiKey) return []
  const client = new Anthropic({ apiKey })
  const ids: string[] = []
  for await (const model of client.models.list()) ids.push(model.id)
  return ids.sort()
}

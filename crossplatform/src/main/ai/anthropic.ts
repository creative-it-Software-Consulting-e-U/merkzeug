/** Anthropic API (Claude) with a stored API key – pay-as-you-go, no subscription. */
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from './keys'
import { STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { AbortedError, MAX_TOOL_STEPS, type AiProvider, type ProviderRequest, type ProviderResult } from './provider'

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5'

export const anthropicProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const apiKey = getApiKey('anthropic')
    if (!apiKey) throw new Error('No Anthropic API key stored.')
    const client = new Anthropic({ apiKey })
    const context = contextBlock(request.context)
    const vault = request.vault
    // Small inputs (paths, passages); streamed eagerly and validated in vault.run
    const tools: Anthropic.Beta.BetaTool[] = (vault?.specs ?? []).map((spec) => ({
      name: spec.name,
      description: spec.description,
      input_schema: spec.parameters,
      eager_input_streaming: true
    }))
    const system: Anthropic.Beta.BetaTextBlockParam[] = [
      { type: 'text', text: STABLE_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
      ...(vault?.toolInstructions ? [{ type: 'text' as const, text: vault.toolInstructions }] : []),
      ...(context ? [{ type: 'text' as const, text: context }] : [])
    ]
    const messages: Anthropic.Beta.BetaMessageParam[] = request.messages.map((m) => ({ role: m.role, content: m.content }))
    let jsonRetries = 0
    let model: string | undefined
    try {
      for (let step = 0; step < MAX_TOOL_STEPS; step++) {
        const stream = client.beta.messages.stream(
          {
            model: request.model || ANTHROPIC_DEFAULT_MODEL,
            max_tokens: 32000,
            // Safety-classifier declines are re-run on a fallback model server-side.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            // caches the growing conversation between tool round trips
            cache_control: { type: 'ephemeral' },
            system,
            ...(tools.length ? { tools } : {}),
            messages
          },
          { signal }
        )
        let streamedText = false
        stream.on('text', (delta) => {
          streamedText = true
          onDelta(delta)
        })
        let message: Anthropic.Beta.BetaMessage
        try {
          message = await stream.finalMessage()
          jsonRetries = 0
        } catch (err) {
          // only unparseable tool input is retried; API errors and cancels propagate
          if (signal.aborted || err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err
          continue
        }
        model = message.model
        if (message.stop_reason === 'refusal') {
          throw new Error(message.stop_details?.explanation || 'The model declined this request.')
        }
        const text = message.content
          .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('')
        if (message.stop_reason === 'pause_turn') {
          messages.push({ role: 'assistant', content: message.content })
          continue
        }
        const toolUses = message.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use')
        if (toolUses.length === 0 || !vault) return { text, model }
        if (message.stop_reason === 'max_tokens') throw new Error('The answer was cut off while calling a tool.')
        messages.push({ role: 'assistant', content: message.content })
        // sequential: two edits of the same file must not race
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
        for (const use of toolUses) {
          const outcome = await vault.run(use.name, use.input)
          results.push({ type: 'tool_result', tool_use_id: use.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) })
        }
        messages.push({ role: 'user', content: results })
        if (streamedText) onDelta('\n\n')
      }
      throw new Error('The assistant needed too many steps; ask for a smaller part of the task.')
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

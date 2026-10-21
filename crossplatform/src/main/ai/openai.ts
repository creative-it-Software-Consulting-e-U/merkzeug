/** OpenAI API with a stored API key – pay-as-you-go, no subscription. */
import OpenAI from 'openai'
import { getApiKey } from './keys'
import { STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { AbortedError, type AiProvider, type ProviderRequest, type ProviderResult } from './provider'

export const OPENAI_DEFAULT_MODEL = 'gpt-5'

export const openaiProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const apiKey = getApiKey('openai')
    if (!apiKey) throw new Error('No OpenAI API key stored.')
    const client = new OpenAI({ apiKey })
    const context = contextBlock(request.context)
    const model = request.model || OPENAI_DEFAULT_MODEL
    try {
      const stream = await client.responses.create(
        {
          model,
          instructions: context ? `${STABLE_INSTRUCTIONS}\n\n${context}` : STABLE_INSTRUCTIONS,
          input: request.messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true
        },
        { signal }
      )
      let text = ''
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          text += event.delta
          onDelta(event.delta)
        } else if (event.type === 'response.completed') {
          return { text: event.response.output_text || text, model: event.response.model }
        } else if (event.type === 'response.failed') {
          throw new Error(event.response.error?.message ?? 'The request failed.')
        } else if (event.type === 'response.incomplete') {
          throw new Error(event.response.incomplete_details?.reason ?? 'The answer is incomplete.')
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
      return { text, model }
    } catch (err) {
      if (signal.aborted) throw new AbortedError()
      throw err
    }
  }
}

/** Model ids for the settings dropdown (requires a stored key). */
export async function listOpenAiModels(): Promise<string[]> {
  const apiKey = getApiKey('openai')
  if (!apiKey) return []
  const client = new OpenAI({ apiKey })
  const ids: string[] = []
  for await (const model of client.models.list()) ids.push(model.id)
  return ids.sort()
}

/** OpenAI API with a stored API key – pay-as-you-go, no subscription. */
import OpenAI from 'openai'
import { getApiKey } from './keys'
import { STABLE_INSTRUCTIONS, contextBlock } from './prompt'
import { AbortedError, MAX_TOOL_STEPS, type AiProvider, type ProviderRequest, type ProviderResult } from './provider'

export const OPENAI_DEFAULT_MODEL = 'gpt-5'

export const openaiProvider: AiProvider = {
  async chat(request: ProviderRequest, signal: AbortSignal, onDelta): Promise<ProviderResult> {
    const apiKey = getApiKey('openai')
    if (!apiKey) throw new Error('No OpenAI API key stored.')
    const client = new OpenAI({ apiKey })
    const context = contextBlock(request.context)
    const model = request.model || OPENAI_DEFAULT_MODEL
    const vault = request.vault
    const instructions = [STABLE_INSTRUCTIONS, vault?.toolInstructions, context].filter(Boolean).join('\n\n')
    const tools: OpenAI.Responses.FunctionTool[] = (vault?.specs ?? []).map((spec) => ({
      type: 'function',
      name: spec.name,
      description: spec.description,
      parameters: spec.parameters,
      strict: false
    }))
    const input: OpenAI.Responses.ResponseInputItem[] = request.messages.map((m) => ({ role: m.role, content: m.content }))
    try {
      for (let step = 0; step < MAX_TOOL_STEPS; step++) {
        const stream = await client.responses.create(
          { model, instructions, input, stream: true, ...(tools.length ? { tools } : {}) },
          { signal }
        )
        let text = ''
        let response: OpenAI.Responses.Response | null = null
        for await (const event of stream) {
          if (event.type === 'response.output_text.delta') {
            text += event.delta
            onDelta(event.delta)
          } else if (event.type === 'response.completed') {
            response = event.response
          } else if (event.type === 'response.failed') {
            throw new Error(event.response.error?.message ?? 'The request failed.')
          } else if (event.type === 'response.incomplete') {
            throw new Error(event.response.incomplete_details?.reason ?? 'The answer is incomplete.')
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
        if (!response) return { text, model }
        const calls = response.output.filter((item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === 'function_call')
        if (calls.length === 0 || !vault) return { text: response.output_text || text, model: response.model }
        // hand back reasoning items and calls unchanged, then one output per call
        input.push(...(response.output as OpenAI.Responses.ResponseInputItem[]))
        for (const call of calls) {
          let args: unknown
          try {
            args = JSON.parse(call.arguments)
          } catch {
            args = null
          }
          const outcome = await vault.run(call.name, args)
          input.push({ type: 'function_call_output', call_id: call.call_id, output: outcome.isError ? `Error: ${outcome.content}` : outcome.content })
        }
        if (text) onDelta('\n\n')
      }
      throw new Error('The assistant needed too many steps; ask for a smaller part of the task.')
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

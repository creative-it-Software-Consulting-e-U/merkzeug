import type { AiChatMessage, AiContext } from '../../shared/types'

export interface ProviderRequest {
  messages: AiChatMessage[]
  context: AiContext
  /** model override from the settings (empty = provider default) */
  model: string
}

export interface ProviderResult {
  text: string
  model?: string
}

export interface AiProvider {
  /** Streams text deltas via onDelta and resolves with the complete answer. */
  chat(request: ProviderRequest, signal: AbortSignal, onDelta: (text: string) => void): Promise<ProviderResult>
}

/** Thrown when the user cancels; the panel drops the partial answer silently. */
export class AbortedError extends Error {
  constructor() {
    super('aborted')
    this.name = 'AbortedError'
  }
}

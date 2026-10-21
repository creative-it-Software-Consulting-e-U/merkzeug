import type { VaultToolSpec } from '@merkzeug/core/assistantTools'
import type { AiChatMessage, AiContext } from '../../shared/types'
import type { ToolOutcome, VaultActivity, VaultSession } from './vaultTools'

/** Vault access of one request: the hosted APIs call the tools, the CLIs work in the vault folder. */
export interface VaultHost {
  session: VaultSession
  specs: VaultToolSpec[]
  /** system prompt addition for the hosted APIs (Merkzeug tools) */
  toolInstructions: string
  /** system prompt addition for the CLIs (their own file tools) */
  cliInstructions: string
  /** validates and runs a tool call of the model */
  run(name: string, input: unknown): Promise<ToolOutcome>
  /** progress for the panel (files read/changed, CLI tool use) */
  report(activity: VaultActivity): void
}

export interface ProviderRequest {
  messages: AiChatMessage[]
  context: AiContext
  /** model override from the settings (empty = provider default) */
  model: string
  /** null = only the open note is available */
  vault: VaultHost | null
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

/** Upper bound for model ↔ tool round trips in one answer. */
export const MAX_TOOL_STEPS = 50

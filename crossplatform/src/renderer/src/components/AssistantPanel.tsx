import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderMermaid, validateMermaid } from '@merkzeug/editor/mermaid'
import { translate } from '../translate'
import type { AiChatEvent, AiChatRequest, AiContext, AiProviderId, AiStatus } from '../../../shared/types'
import { fencedBlock, renderInline, splitAnswer } from '../util/assistant'
import { IconClose, IconSend, IconStop } from './icons'

export interface AssistantNoteContext {
  notePath: string | null
  noteMarkdown: string | null
  selection: string | null
}

interface AssistantPanelProps {
  vaultName: string | null
  /** read at send time: open note, its Markdown and the selection */
  getContext: () => AssistantNoteContext
  /** an editable note is active */
  canInsert: boolean
  onInsert: (markdown: string, mode: 'insert' | 'replace') => void
  onClose: () => void
  onOpenSettings: () => void
}

interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** sent by the panel itself (Mermaid repair), shown muted */
  auto?: boolean
  streaming?: boolean
  error?: string
  model?: string
  /** parse errors of Mermaid blocks, by block index */
  mermaidErrors?: Record<number, string>
}

const providerLabel = (id: AiProviderId): string =>
  ({
    anthropic: 'Anthropic API (Claude)',
    openai: 'OpenAI API',
    'claude-cli': translate("Claude Code (local login)"),
    'codex-cli': translate("Codex / ChatGPT (local login)")
  })[id]

/** How often a broken diagram is sent back for repair before giving up */
const MAX_AUTO_FIXES = 2

function MermaidPreview({ code }: { code: string }): React.JSX.Element | null {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    setFailed(false)
    renderMermaid(code).then(
      (result) => active && setSvg(result),
      () => active && setFailed(true)
    )
    return () => {
      active = false
    }
  }, [code])
  if (failed || !svg) return null
  return <div className="assistant-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}

export function AssistantPanel(props: AssistantPanelProps): React.JSX.Element {
  const { getContext, onInsert, canInsert } = props
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [includeNote, setIncludeNote] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const autoFixesRef = useRef(0)
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const refreshStatus = useCallback(() => {
    void window.merkzeug.aiStatus().then(setStatus)
  }, [])
  useEffect(() => {
    refreshStatus()
    inputRef.current?.focus()
    return window.merkzeug.onAiSettingsChanged(refreshStatus)
  }, [refreshStatus])

  // keep the newest answer in view while it streams
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [entries])

  const provider = status?.settings.provider ?? null
  const providerStatus = status?.providers.find((p) => p.id === provider) ?? null
  const ready = Boolean(providerStatus?.ready)

  const send = useCallback(
    (text: string, auto = false) => {
      if (!text.trim() || !provider) return
      const context = getContext()
      const requestContext: AiContext = {
        vaultName: props.vaultName,
        notePath: context.notePath,
        noteMarkdown: includeNote ? context.noteMarkdown : null,
        selection: context.selection
      }
      const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', content: text.trim(), auto }
      const answerId = crypto.randomUUID()
      const history = [...entriesRef.current.filter((e) => !e.error && e.content), userEntry]
      setEntries([...entriesRef.current, userEntry, { id: answerId, role: 'assistant', content: '', streaming: true }])
      setActiveId(answerId)
      const request: AiChatRequest = {
        id: answerId,
        messages: history.map((e) => ({ role: e.role, content: e.content })),
        context: requestContext,
        locale: navigator.language
      }
      void window.merkzeug.aiChat(request)
    },
    [getContext, includeNote, props.vaultName, provider]
  )

  const update = useCallback((id: string, patch: (entry: ChatEntry) => ChatEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? patch(e) : e)))
  }, [])

  // answers and errors from the main process
  useEffect(() => {
    return window.merkzeug.onAiEvent((event: AiChatEvent) => {
      if (event.type === 'delta') {
        update(event.id, (e) => ({ ...e, content: e.content + event.text }))
      } else if (event.type === 'error') {
        update(event.id, (e) => ({ ...e, streaming: false, error: event.message }))
        setActiveId((current) => (current === event.id ? null : current))
      } else {
        const entry = entriesRef.current.find((e) => e.id === event.id)
        const text = event.text || entry?.content || ''
        update(event.id, (e) => ({ ...e, content: text, streaming: false, model: event.model }))
        setActiveId((current) => (current === event.id ? null : current))
        void checkMermaid(event.id, text)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update])

  /** Validates Mermaid blocks; a broken one goes back to the model for repair (bounded). */
  const checkMermaid = async (id: string, text: string): Promise<void> => {
    const blocks = splitAnswer(text)
    const errors: Record<number, string> = {}
    for (const [index, block] of blocks.entries()) {
      if (block.kind !== 'code' || block.lang !== 'mermaid') continue
      const error = await validateMermaid(block.code)
      if (error) errors[index] = error
    }
    if (Object.keys(errors).length === 0) {
      autoFixesRef.current = 0
      return
    }
    update(id, (e) => ({ ...e, mermaidErrors: errors }))
    if (autoFixesRef.current >= MAX_AUTO_FIXES) return
    autoFixesRef.current += 1
    const detail = Object.values(errors).join('\n')
    send(
      `${translate("The Mermaid diagram does not parse in Merkzeug:")}\n${detail}\n${translate("Please return the corrected diagram as a complete mermaid block.")}`,
      true
    )
  }

  const submit = (): void => {
    if (activeId || !ready) return
    const text = input
    setInput('')
    autoFixesRef.current = 0
    send(text)
  }

  const cancel = (): void => {
    if (activeId) void window.merkzeug.aiCancel(activeId)
  }

  const copy = (text: string): void => {
    void navigator.clipboard.writeText(text)
  }

  const changeProvider = (id: AiProviderId): void => {
    if (!status) return
    void window.merkzeug.aiSaveSettings({ ...status.settings, provider: id }).then(setStatus)
  }

  const rendered = useMemo(
    () =>
      entries.map((entry) => {
        if (entry.role === 'user') {
          return (
            <div key={entry.id} className={`assistant-msg user${entry.auto ? ' auto' : ''}`}>
              {entry.content}
            </div>
          )
        }
        const blocks = splitAnswer(entry.content)
        return (
          <div key={entry.id} className={`assistant-msg assistant${entry.streaming ? ' streaming' : ''}`}>
            {blocks.map((block, index) =>
              block.kind === 'text' ? (
                block.text.split(/\n{2,}/).map((para, i) => (
                  <p key={`${index}-${i}`}>{renderInline(para)}</p>
                ))
              ) : (
                <div key={index} className="assistant-code">
                  {block.lang === 'mermaid' && !entry.streaming && !entry.mermaidErrors?.[index] && (
                    <MermaidPreview code={block.code} />
                  )}
                  <pre>
                    <code>{block.code}</code>
                  </pre>
                  {entry.mermaidErrors?.[index] && (
                    <div className="assistant-error">{entry.mermaidErrors[index]}</div>
                  )}
                  {!entry.streaming && (
                    <div className="assistant-actions">
                      <button disabled={!canInsert} onClick={() => onInsert(fencedBlock(block.lang, block.code), 'insert')}>
                        {translate("Insert")}
                      </button>
                      {hasSelection && (
                        <button disabled={!canInsert} onClick={() => onInsert(fencedBlock(block.lang, block.code), 'replace')}>
                          {translate("Replace selection")}
                        </button>
                      )}
                      <button onClick={() => copy(block.code)}>{translate("Copy")}</button>
                    </div>
                  )}
                </div>
              )
            )}
            {entry.error && <div className="assistant-error">{entry.error}</div>}
            {entry.streaming && !entry.content && <div className="assistant-thinking">…</div>}
            {!entry.streaming && entry.content && (
              <div className="assistant-actions message">
                <button disabled={!canInsert} onClick={() => onInsert(entry.content, 'insert')}>
                  {translate("Insert answer")}
                </button>
                {hasSelection && (
                  <button disabled={!canInsert} onClick={() => onInsert(entry.content, 'replace')}>
                    {translate("Replace selection")}
                  </button>
                )}
                <button onClick={() => copy(entry.content)}>{translate("Copy")}</button>
                {entry.model && <span className="assistant-model">{entry.model}</span>}
              </div>
            )}
          </div>
        )
      }),
    [entries, canInsert, hasSelection, onInsert]
  )

  const currentLabel = provider ? providerLabel(provider) : null

  return (
    <aside className="assistant-panel" onFocusCapture={() => setHasSelection(Boolean(getContext().selection))}>
      <div className="assistant-head">
        <h3>{translate("AI Assistant")}</h3>
        <select
          className="assistant-provider"
          value={provider ?? ''}
          onChange={(e) => changeProvider(e.target.value as AiProviderId)}
          title={providerStatus?.detail}
        >
          {!provider && <option value="">{translate("Choose provider…")}</option>}
          {status?.providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.ready}>
              {providerLabel(p.id)}
              {p.ready ? '' : ` – ${translate("not set up")}`}
            </option>
          ))}
        </select>
        <button className="toolbar-btn icon" data-tip={translate("Settings…")} onClick={props.onOpenSettings}>
          ⚙
        </button>
        <button className="toolbar-btn icon" data-tip={translate("Clear conversation")} onClick={() => setEntries([])} disabled={entries.length === 0}>
          ⌫
        </button>
        <button className="toolbar-btn icon" data-tip={translate("Close (⇧⌘A)")} onClick={props.onClose}>
          <IconClose />
        </button>
      </div>
      <div className="assistant-list" ref={listRef}>
        {entries.length === 0 && (
          <div className="assistant-empty">
            {ready ? (
              <>
                <p>{translate("Ask for a Mermaid diagram, a summary, a rewrite or a table. Answers can be inserted into the note.")}</p>
                <p className="assistant-hint">
                  {includeNote
                    ? translate("The open note is sent along as context to")
                    : translate("Only your question and the selection are sent to")}{' '}
                  {currentLabel}.
                </p>
              </>
            ) : (
              <>
                <p>{translate("No AI provider is set up yet.")}</p>
                <button onClick={props.onOpenSettings}>{translate("Open settings")}</button>
              </>
            )}
          </div>
        )}
        {rendered}
      </div>
      <div className="assistant-input">
        <textarea
          ref={inputRef}
          value={input}
          rows={3}
          placeholder={ready ? translate("Describe the diagram or ask a question…") : translate("Set up a provider first.")}
          disabled={!ready}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className="assistant-input-row">
          <label className="assistant-check">
            <input type="checkbox" checked={includeNote} onChange={(e) => setIncludeNote(e.target.checked)} />
            {translate("Send note as context")}
          </label>
          <div className="toolbar-spacer" />
          {activeId ? (
            <button className="assistant-send" onClick={cancel} data-tip={translate("Stop")}>
              <IconStop />
            </button>
          ) : (
            <button className="assistant-send" onClick={submit} disabled={!ready || !input.trim()} data-tip={translate("Send (Enter)")}>
              <IconSend />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

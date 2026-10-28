import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderMermaid, validateMermaid } from '@merkzeug/editor/mermaid'
import { translate } from '../translate'
import type { AiActivity, AiChatEvent, AiChatRequest, AiContext, AiFileChange, AiProviderId, AiProviderStatus, AiStatus, AiUndoResult } from '../../../shared/types'
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
  /** files listed, searched, read or changed while answering */
  activities?: AiActivity[]
  changes?: AiFileChange[]
  undoComplete?: boolean
  undo?: AiUndoResult
  /** editing was needed but not allowed: the reason, and the request to resend */
  needsWrite?: { reason: string; request: string }
}

type VaultAccess = AiChatRequest['vaultAccess']

function activityLabel(activity: AiActivity): string {
  const path = activity.path || '/'
  switch (activity.kind) {
    case 'list':
      return `${translate("Listed")} ${path}`
    case 'search':
      return activity.detail ? `${translate("Searched")} „${activity.detail}“ ${translate("in")} ${path}` : `${translate("Searched")} ${path}`
    case 'read':
      return `${translate("Read")} ${path}`
    case 'write':
      return `${translate("Changed")} ${path}`
    case 'denied':
      return `${translate("Denied")} ${activity.path}${activity.detail ? ` – ${activity.detail}` : ''}`
    case 'needsWrite':
      return translate("Editing is needed")
  }
}

const changeLabel = (change: AiFileChange): string =>
  ({ created: translate("created"), modified: translate("changed"), deleted: translate("deleted") })[change.kind]

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
  // editing is never stored: it applies to this panel session only
  const [allowWrite, setAllowWrite] = useState(false)
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
  const vaultRead = Boolean(props.vaultName) && status?.settings.vaultRead !== false
  const access: VaultAccess = !vaultRead ? 'none' : allowWrite ? 'write' : 'read'
  const providerStatus = status?.providers.find((p) => p.id === provider) ?? null
  const ready = Boolean(providerStatus?.ready)
  // App Store: Claude Code/Codex wait for the one-time launcher approval
  const needsApproval = (p: AiProviderStatus | null): boolean => Boolean(p?.bridge && p.bridge !== 'ready')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const allowCli = (): void => {
    setApprovalError(null)
    window.merkzeug.aiAllowCli().then(setStatus, (err) => setApprovalError(String(err).replace(/^Error: Error invoking remote method '[^']*': (Error: )?/, '')))
  }

  const send = useCallback(
    (text: string, auto = false, accessOverride?: VaultAccess) => {
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
        locale: navigator.language,
        vaultAccess: accessOverride ?? access
      }
      void window.merkzeug.aiChat(request)
    },
    [access, getContext, includeNote, props.vaultName, provider]
  )

  const update = useCallback((id: string, patch: (entry: ChatEntry) => ChatEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? patch(e) : e)))
  }, [])

  // answers and errors from the main process
  useEffect(() => {
    return window.merkzeug.onAiEvent((event: AiChatEvent) => {
      if (event.type === 'delta') {
        update(event.id, (e) => ({ ...e, content: e.content + event.text }))
      } else if (event.type === 'activity') {
        update(event.id, (e) => ({ ...e, activities: [...(e.activities ?? []), event.activity] }))
      } else if (event.type === 'error') {
        update(event.id, (e) => ({ ...e, streaming: false, error: event.message, changes: event.changes, undoComplete: true }))
        setActiveId((current) => (current === event.id ? null : current))
      } else {
        const entries = entriesRef.current
        const index = entries.findIndex((e) => e.id === event.id)
        const entry = entries[index]
        const text = event.text || entry?.content || ''
        const request = entries.slice(0, Math.max(index, 0)).reverse().find((e) => e.role === 'user')?.content ?? ''
        update(event.id, (e) => ({
          ...e,
          content: text,
          streaming: false,
          model: event.model,
          changes: event.changes,
          undoComplete: event.undoComplete,
          needsWrite: event.needsWrite !== undefined ? { reason: event.needsWrite, request } : undefined
        }))
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

  const undo = (id: string): void => {
    void window.merkzeug.aiUndo(id).then((result) => update(id, (e) => ({ ...e, undo: result })))
  }

  /**
   * Allows editing for this session and sends the request again. The refused
   * attempt (request and answer) leaves the conversation, so the model does
   * not argue with its own earlier refusal.
   */
  const allowAndResend = (answerId: string, request: string): void => {
    setAllowWrite(true)
    autoFixesRef.current = 0
    const current = entriesRef.current
    const index = current.findIndex((e) => e.id === answerId)
    const userIndex = current.slice(0, Math.max(index, 0)).map((e) => e.role).lastIndexOf('user')
    const kept = current.filter((_, i) => i !== index && i !== userIndex)
    entriesRef.current = kept
    setEntries(kept)
    send(request, false, 'write')
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
            {entry.activities && entry.activities.length > 0 && (
              <details className="assistant-activity" open={entry.streaming}>
                <summary>
                  {translate("Vault access")} ({entry.activities.length})
                </summary>
                <ul>
                  {entry.activities.map((activity, i) => (
                    <li key={i} className={activity.kind}>
                      {activityLabel(activity)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {entry.error && <div className="assistant-error">{entry.error}</div>}
            {entry.needsWrite && !entry.streaming && (
              <div className="assistant-needs-write">
                <p>
                  {translate("This request needs to change vault files, but editing is not allowed.")}
                  {entry.needsWrite.reason ? ` ${entry.needsWrite.reason}` : ''}
                </p>
                <button disabled={Boolean(activeId) || !entry.needsWrite.request} onClick={() => allowAndResend(entry.id, entry.needsWrite!.request)}>
                  {translate("Allow editing and send again")}
                </button>
              </div>
            )}
            {entry.changes && entry.changes.length > 0 && !entry.streaming && (
              <div className="assistant-changes">
                <div className="assistant-changes-head">
                  {translate("Changed files")} ({entry.changes.length})
                </div>
                <ul>
                  {entry.changes.map((change) => (
                    <li key={change.path}>
                      {change.path} <span>– {changeLabel(change)}</span>
                    </li>
                  ))}
                </ul>
                {entry.undo ? (
                  <div className="assistant-hint">
                    {translate("Restored:")} {entry.undo.restored.length}
                    {entry.undo.skipped.length > 0 &&
                      ` · ${translate("Changed again since, left as they are:")} ${entry.undo.skipped.join(', ')}`}
                  </div>
                ) : (
                  <>
                    <button onClick={() => undo(entry.id)}>{translate("Undo changes")}</button>
                    {entry.undoComplete === false && (
                      <div className="assistant-hint">{translate("The vault was too large to back up completely; some changes may not be undoable.")}</div>
                    )}
                  </>
                )}
              </div>
            )}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, canInsert, hasSelection, onInsert, activeId]
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
            <option key={p.id} value={p.id} disabled={!p.ready && !needsApproval(p)}>
              {providerLabel(p.id)}
              {p.ready ? '' : ` – ${needsApproval(p) ? translate("approval needed") : translate("not set up")}`}
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
                {vaultRead && (
                  <p className="assistant-hint">
                    {allowWrite
                      ? translate("The assistant may read and change text files in this vault. Changes can be undone per answer.")
                      : translate("The assistant may read text files in this vault when your request needs them; each file it reads is sent to the provider.")}
                  </p>
                )}
              </>
            ) : needsApproval(providerStatus) ? (
              <>
                <p>
                  {translate("The App Store version of Merkzeug needs your approval once to start Claude Code and Codex with their own login.")}
                </p>
                <button onClick={allowCli}>{providerStatus?.bridge === 'outdated' ? translate("Renew approval…") : translate("Allow…")}</button>
                {approvalError && <p className="assistant-hint">{approvalError}</p>}
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
          {props.vaultName && (
            <>
              <label className="assistant-check" title={translate("List, search and read text files of the vault when needed")}>
                <input
                  type="checkbox"
                  checked={vaultRead}
                  disabled={!status}
                  onChange={(e) => {
                    if (!status) return
                    if (!e.target.checked) setAllowWrite(false)
                    void window.merkzeug.aiSaveSettings({ ...status.settings, vaultRead: e.target.checked }).then(setStatus)
                  }}
                />
                {translate("Read vault")}
              </label>
              <label className={`assistant-check${allowWrite ? ' warn' : ''}`} title={translate("Create and change text files of the vault (this session only)")}>
                <input type="checkbox" checked={allowWrite} disabled={!vaultRead} onChange={(e) => setAllowWrite(e.target.checked)} />
                {translate("Allow editing")}
              </label>
            </>
          )}
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

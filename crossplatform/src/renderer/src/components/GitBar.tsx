import { useState } from 'react'
import type { GitStatus } from '../../../shared/types'

interface GitBarProps {
  status: GitStatus | null
  busy: boolean
  onCommitPush: (message: string) => void
  onPull: () => void
}

/** Git-Status in der Sidebar: Branch, Änderungen, Commit & Push, Pull. */
export function GitBar({ status, busy, onCommitPush, onPull }: GitBarProps): React.JSX.Element | null {
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(false)

  if (!status || !status.isRepo) return null

  const changeCount = status.changes.length
  const summaryParts: string[] = []
  if (changeCount > 0) summaryParts.push(`${changeCount} geändert`)
  if (status.ahead > 0) summaryParts.push(`${status.ahead}↑`)
  if (status.behind > 0) summaryParts.push(`${status.behind}↓`)

  return (
    <div className="git-bar">
      <button
        className="git-summary"
        onClick={() => setExpanded((v) => !v)}
        title="Git-Status anzeigen"
      >
        <span className="git-branch">⎇ {status.branch}</span>
        <span className={`git-changes${changeCount > 0 ? ' has-changes' : ''}`}>
          {summaryParts.length > 0 ? summaryParts.join(' · ') : '✓'}
        </span>
      </button>
      {expanded && (
        <div className="git-detail">
          {changeCount > 0 && (
            <ul className="git-file-list">
              {status.changes.slice(0, 12).map((c) => (
                <li key={c.path} title={c.path}>
                  <code>{c.code.trim() || '·'}</code> {c.path}
                </li>
              ))}
              {changeCount > 12 && <li>… und {changeCount - 12} weitere</li>}
            </ul>
          )}
          <input
            placeholder="Commit-Nachricht"
            value={message}
            disabled={busy}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                onCommitPush(message.trim())
                setMessage('')
              }
            }}
          />
          <div className="git-buttons">
            <button
              disabled={busy || (changeCount === 0 && status.ahead === 0) || !message.trim() && changeCount > 0}
              onClick={() => {
                onCommitPush(message.trim() || 'Änderungen')
                setMessage('')
              }}
            >
              {busy ? '…' : 'Commit & Push'}
            </button>
            <button disabled={busy || !status.hasRemote} onClick={onPull}>
              Pull
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

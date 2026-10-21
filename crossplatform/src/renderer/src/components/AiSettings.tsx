import { useCallback, useEffect, useState } from 'react'
import { t as translate } from '@merkzeug/core/i18n'
import type { AiProviderId, AiStatus } from '../../../shared/types'

/** Settings section of the AI assistant: provider, API keys (encrypted) and models. */
export function AiSettings(): React.JSX.Element {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [models, setModels] = useState<Partial<Record<AiProviderId, string[]>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    void window.merkzeug.aiStatus().then(setStatus)
  }, [])
  useEffect(() => {
    refresh()
    return window.merkzeug.onAiSettingsChanged(refresh)
  }, [refresh])

  if (!status) return <section className="settings-section" />

  const run = (label: string, action: () => Promise<AiStatus>): void => {
    setBusy(label)
    setError(null)
    action().then(setStatus, (err) => setError(String(err).replace(/^Error: Error invoking remote method '[^']*': (Error: )?/, ''))).finally(() => setBusy(null))
  }

  const choose = (provider: AiProviderId): void =>
    run(provider, () => window.merkzeug.aiSaveSettings({ ...status.settings, provider }))

  const setModel = (provider: AiProviderId, model: string): void => {
    setStatus({ ...status, settings: { ...status.settings, models: { ...status.settings.models, [provider]: model } } })
  }
  const commitModel = (provider: AiProviderId): void =>
    run(`model:${provider}`, () => window.merkzeug.aiSaveSettings(status.settings))

  const loadModels = (provider: AiProviderId): void => {
    setBusy(`models:${provider}`)
    setError(null)
    window.merkzeug
      .aiListModels(provider)
      .then((ids) => setModels((prev) => ({ ...prev, [provider]: ids })), (err) => setError(String(err)))
      .finally(() => setBusy(null))
  }

  const info: Record<AiProviderId, { title: string; hint: string; keyed: boolean }> = {
    anthropic: {
      title: 'Anthropic API (Claude)',
      hint: translate("Pay-as-you-go with an API key from console.anthropic.com. Default model: claude-opus-5-5."),
      keyed: true
    },
    openai: {
      title: 'OpenAI API',
      hint: translate("Pay-as-you-go with an API key from platform.openai.com. Default model: gpt-5."),
      keyed: true
    },
    'claude-cli': {
      title: translate("Claude Code (local login)"),
      hint: translate("Uses the Claude Code CLI installed on this computer and its login (subscription or API key). Merkzeug never sees the credentials."),
      keyed: false
    },
    'codex-cli': {
      title: translate("Codex / ChatGPT (local login)"),
      hint: translate("Uses the Codex CLI – installed separately or bundled with the ChatGPT desktop app – and its ChatGPT login. Works in the vault folder with vault access (writing only when editing is allowed), otherwise read-only in an empty folder."),
      keyed: false
    }
  }

  return (
    <section className="settings-section">
      <h2>{translate("AI assistant")}</h2>
      <p className="settings-hint">
        {translate("The assistant panel (⇧⌘A) sends your question, the selection and – if enabled – the open note to the chosen provider. Nothing is sent until you ask.")}
      </p>
      {!status.keyStorage && (
        <p className="settings-error">{translate("API keys cannot be stored: no system keyring is available. The local CLI providers still work.")}</p>
      )}
      <div className="settings-list">
        {status.providers.map((p) => (
          <div key={p.id} className="settings-ai-provider">
            <input
              type="radio"
              name="ai-provider"
              checked={status.settings.provider === p.id}
              disabled={!p.ready}
              onChange={() => choose(p.id)}
            />
            <div className="settings-ai-body">
              <span className="settings-ai-title">{info[p.id].title}</span>
              <span className={`settings-ai-detail${p.ready ? ' ready' : ''}`}>{translate(p.detail)}</span>
              <span className="settings-ai-detail">{info[p.id].hint}</span>
              {info[p.id].keyed && status.keyStorage && (
                <div className="settings-ai-row">
                  <input
                    type="password"
                    placeholder={p.ready ? translate("Replace stored API key…") : translate("API key")}
                    value={keys[p.id] ?? ''}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keys[p.id]?.trim()) {
                        run(`key:${p.id}`, () => window.merkzeug.aiSaveKey(p.id as 'anthropic' | 'openai', keys[p.id] ?? ''))
                        setKeys((prev) => ({ ...prev, [p.id]: '' }))
                      }
                    }}
                  />
                  <button
                    disabled={!keys[p.id]?.trim() || busy !== null}
                    onClick={() => {
                      run(`key:${p.id}`, () => window.merkzeug.aiSaveKey(p.id as 'anthropic' | 'openai', keys[p.id] ?? ''))
                      setKeys((prev) => ({ ...prev, [p.id]: '' }))
                    }}
                  >
                    {translate("Save key")}
                  </button>
                  {p.ready && (
                    <button disabled={busy !== null} onClick={() => run(`key:${p.id}`, () => window.merkzeug.aiSaveKey(p.id as 'anthropic' | 'openai', ''))}>
                      {translate("Remove")}
                    </button>
                  )}
                </div>
              )}
              <div className="settings-ai-row">
                <input
                  type="text"
                  list={`ai-models-${p.id}`}
                  placeholder={translate("Model (empty = default)")}
                  value={status.settings.models[p.id] ?? ''}
                  onChange={(e) => setModel(p.id, e.target.value)}
                  onBlur={() => commitModel(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitModel(p.id)
                  }}
                />
                <datalist id={`ai-models-${p.id}`}>
                  {(models[p.id] ?? []).map((id) => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
                {info[p.id].keyed && p.ready && (
                  <button disabled={busy !== null} onClick={() => loadModels(p.id)}>
                    {busy === `models:${p.id}` ? '…' : translate("Load models")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="settings-error">{error}</p>}
    </section>
  )
}

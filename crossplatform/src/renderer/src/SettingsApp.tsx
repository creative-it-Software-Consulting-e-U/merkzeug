import { t as translate, getLocale } from '@merkzeug/core/i18n'
import { useCallback, useEffect, useState } from 'react'
import type { TemplateState } from '../../shared/types'

/** IPC-Fehlermeldungen von ihrem "Error invoking remote method"-Präfix befreien */
function cleanError(err: unknown): string {
  return String(err).replace(/^Error:.*'tpl:[^']*':\s*(Error:)?\s*/, '')
}

/** Einstellungs-Fenster (#settings): PDF-Vorlagen verwalten und dem Vault zuweisen. */
export function SettingsApp(): React.JSX.Element {
  const [state, setState] = useState<TemplateState | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    void window.merkzeug.getTemplateState().then(setState)
  }, [])

  useEffect(() => {
    document.title = translate("Settings")
    refresh()
    const offRefresh = window.merkzeug.onSettingsRefresh(refresh)
    // Vorlagen werden im Finder/Explorer bearbeitet: beim Zurückwechseln neu einlesen
    window.addEventListener('focus', refresh)
    return () => {
      offRefresh()
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const run = (action: () => Promise<TemplateState>): void => {
    setError(null)
    action().then(setState, (err) => setError(cleanError(err)))
  }

  const handleCreate = (): void => {
    const name = newName.trim()
    if (!name) return
    setError(null)
    window.merkzeug.createTemplate(name).then((s) => {
      setState(s)
      setNewName('')
    }, (err) => setError(cleanError(err)))
  }

  if (!state) return <div className="settings-app" />

  const templateGuide = getLocale().toLowerCase().startsWith('de')
    ? 'https://merkzeug.creative-it.com/help-de.html#pdf-startvorlage'
    : 'https://merkzeug.creative-it.com/help-en.html#pdf-template-starter'
  const vaultName = state.vault?.split(/[/\\]/).pop() ?? null

  return (
    <div className="settings-app">
      <h1>{translate("PDF templates")}</h1>

      <section className="settings-section">
        <h2>{translate("Templates folder")}</h2>
        <div className="settings-row">
          <span className="settings-path" title={state.templatesRoot}>
            {state.templatesRoot}
          </span>
          <button onClick={() => run(() => window.merkzeug.pickTemplatesRoot())}>{translate("Change…")}</button>
          <button onClick={() => void window.merkzeug.showTemplatesRoot()}>{translate("Show")}</button>
        </div>
        <p className="settings-hint">
          {translate("Each template has its own subfolder. Store the templates folder in iCloud Drive, Google Drive, OneDrive or Dropbox to sync templates across devices.")}
        </p>
      </section>

      <section className="settings-section">
        <h2>{translate("Templates")}</h2>
        <div className="settings-list">
          {state.templates.length === 0 && (
            <div className="settings-empty">
              {translate("No templates yet. Create a template below.")}
            </div>
          )}
          {state.templates.map((name) => (
            <div key={name} className="settings-list-row">
              <span>{name}</span>
              <button onClick={() => void window.merkzeug.showTemplate(name)}>{translate("Edit")}</button>
            </div>
          ))}
        </div>
        <div className="settings-new">
          <input
            type="text"
            placeholder={translate("New template name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
          <button onClick={handleCreate} disabled={!newName.trim()}>
            {translate("Create")}
          </button>
        </div>
        <p className="settings-hint">
          {translate("Merkzeug includes a styled PDF template. Create a copy to customize it with your own colors, logo or an agent.")}{' '}
          <button onClick={() => void window.merkzeug.openExternal(templateGuide)}>{translate("Template guide and agent prompt")}</button>
        </p>
        {error && <p className="settings-error">{error}</p>}
      </section>

      {state.vault && (
        <section className="settings-section">
          <h2>{translate("Template for this vault")}</h2>
          <div className="settings-row">
            <span className="settings-path" title={state.vault}>
              {vaultName}
            </span>
            <select
              className="settings-select"
              value={state.assigned ?? ''}
              onChange={(e) => run(() => window.merkzeug.assignTemplate(e.target.value || null))}
            >
              <option value="">{translate("No template")}</option>
              {state.templates.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {state.assigned && !state.templates.includes(state.assigned) && (
                <option value={state.assigned}>{state.assigned} ({translate("missing")})</option>
              )}
            </select>
          </div>
          <p className="settings-hint">
            {translate("The selection is stored in the vault (")}<code>.merkzeug/settings.json</code>{translate(") and travels with Git to your other devices. Export as PDF (⌘P) uses it automatically.")}
          </p>
        </section>
      )}
    </div>
  )
}

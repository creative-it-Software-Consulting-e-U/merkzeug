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
    document.title = 'Einstellungen'
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

  const vaultName = state.vault?.split(/[/\\]/).pop() ?? null

  return (
    <div className="settings-app">
      <h1>PDF-Vorlagen</h1>

      <section className="settings-section">
        <h2>Vorlagen-Ordner</h2>
        <div className="settings-row">
          <span className="settings-path" title={state.templatesRoot}>
            {state.templatesRoot}
          </span>
          <button onClick={() => run(() => window.merkzeug.pickTemplatesRoot())}>Ändern…</button>
          <button onClick={() => void window.merkzeug.showTemplatesRoot()}>Anzeigen</button>
        </div>
        <p className="settings-hint">
          Jede Vorlage ist ein Unterordner. Liegt der Vorlagen-Ordner in iCloud Drive, Google
          Drive, OneDrive oder Dropbox, werden die Vorlagen automatisch auf allen Geräten
          synchronisiert.
        </p>
      </section>

      <section className="settings-section">
        <h2>Vorlagen</h2>
        <div className="settings-list">
          {state.templates.length === 0 && (
            <div className="settings-empty">
              Noch keine Vorlagen — unten eine neue Vorlage anlegen.
            </div>
          )}
          {state.templates.map((name) => (
            <div key={name} className="settings-list-row">
              <span>{name}</span>
              <button onClick={() => void window.merkzeug.showTemplate(name)}>Bearbeiten</button>
            </div>
          ))}
        </div>
        <div className="settings-new">
          <input
            type="text"
            placeholder="Name der neuen Vorlage"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
          <button onClick={handleCreate} disabled={!newName.trim()}>
            Anlegen
          </button>
        </div>
        <p className="settings-hint">
          Eine neue Vorlage wird mit Beispieldateien angelegt (Kopfzeile, Fußzeile, Deckblatt,
          Stil) und im Datei-Manager geöffnet. Logo als Bilddatei dazulegen und in{' '}
          <code>kopfzeile.html</code> referenzieren — Details in der LIESMICH.md der Vorlage.
        </p>
        {error && <p className="settings-error">{error}</p>}
      </section>

      {state.vault && (
        <section className="settings-section">
          <h2>Vorlage für diesen Vault</h2>
          <div className="settings-row">
            <span className="settings-path" title={state.vault}>
              {vaultName}
            </span>
            <select
              className="settings-select"
              value={state.assigned ?? ''}
              onChange={(e) => run(() => window.merkzeug.assignTemplate(e.target.value || null))}
            >
              <option value="">Keine Vorlage</option>
              {state.templates.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {state.assigned && !state.templates.includes(state.assigned) && (
                <option value={state.assigned}>{state.assigned} (fehlt)</option>
              )}
            </select>
          </div>
          <p className="settings-hint">
            Die Zuweisung wird im Vault gespeichert (<code>.merkzeug/settings.json</code>) und
            wandert per Git auf alle Geräte mit. Der Export „Als PDF exportieren…“ (⌘P) verwendet
            sie automatisch.
          </p>
        </section>
      )}
    </div>
  )
}

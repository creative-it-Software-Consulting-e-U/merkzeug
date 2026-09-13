import { t as translate } from '@merkzeug/core/i18n'
import { useEffect, useRef, useState } from 'react'
import { basename, dirname } from '../util/paths'
import { vault, type SearchResult } from '../vault'

interface SearchViewProps {
  onOpen: (path: string) => void
  onClose: () => void
}

const DEBOUNCE_MS = 250

/** Volltext- und Dateinamen-Suche über alle Notizen des Vaults. */
export function SearchView({ onOpen, onClose }: SearchViewProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const id = ++requestId.current
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setBusy(false)
      return
    }
    setBusy(true)
    const timer = setTimeout(() => {
      vault
        .search(trimmed)
        .then((found) => {
          if (requestId.current !== id) return
          setResults(found)
          setBusy(false)
        })
        .catch(() => {
          if (requestId.current !== id) return
          setResults([])
          setBusy(false)
        })
    }, DEBOUNCE_MS)
    return () => { clearTimeout(timer); requestId.current++ }
  }, [query])

  return (
    <div className="vault-search-view">
      <form className="vault-search-bar" role="search" onSubmit={event => { event.preventDefault(); onClose() }}>
        <input
          ref={inputRef}
          className="vault-search-input"
          type="text"
          role="searchbox"
          enterKeyHint="done"
          placeholder={translate("Search vault …")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button className="bar-btn" type="submit">
          {translate("Done")}
        </button>
      </form>
      {query.trim() && !busy && results.length === 0 ? (
        <div className="folder-empty">{translate("No matches.")}</div>
      ) : (
        <ul className="folder-list vault-search-results">
          {results.map((result) => (
            <li key={result.path}>
              <button className="folder-row vault-search-row" onClick={() => onOpen(result.path)}>
                <span className="vault-search-row-text">
                  <span className="vault-search-row-name">{basename(result.path, '.md')}</span>
                  <span className="vault-search-row-path">{dirname(result.path)}</span>
                  {result.snippet && <span className="vault-search-row-snippet">{result.snippet}</span>}
                </span>
                <span className="folder-row-chevron">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { isDefaultNoteName } from './util/autoName'
import { basename } from './util/paths'

export type TabKind = 'note' | 'folder'

export interface Tab {
  id: string
  kind: TabKind
  path: string
  navMode: boolean
  history: string[]
  historyIndex: number
  /** erzwingt Neuladen des Editors bei Navigation im selben Tab */
  loadToken: number
  /** Datei wird automatisch nach der Überschrift 1 benannt (bis zum manuellen Umbenennen) */
  autoName: boolean
}

export interface Pane {
  tabs: Tab[]
  activeTabId: string | null
}

/** Automatische Benennung gilt für Notizen, die noch ihren Standardnamen tragen. */
export function autoNameFor(path: string, kind: TabKind): boolean {
  return kind === 'note' && isDefaultNoteName(basename(path, '.md'))
}

let tabCounter = 0
export function makeTab(path: string, kind: TabKind, navMode = false): Tab {
  tabCounter += 1
  return {
    id: `tab-${tabCounter}`,
    kind,
    path,
    navMode,
    history: [path],
    historyIndex: 0,
    loadToken: 0,
    autoName: autoNameFor(path, kind)
  }
}

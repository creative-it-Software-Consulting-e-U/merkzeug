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
}

export interface Pane {
  tabs: Tab[]
  activeTabId: string | null
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
    loadToken: 0
  }
}

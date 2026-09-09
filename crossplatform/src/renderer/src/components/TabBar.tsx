import { t as translate } from '@merkzeug/core/i18n'
import type { Tab } from '../types'
import { basename } from '../util/paths'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  paneIndex: number
  dirtyTabs: Set<string>
  onActivate: (tabId: string) => void
  onClose: (tabId: string) => void
  onDropTab: (tabId: string, fromPane: number) => void
}

export function TabBar({
  tabs,
  activeTabId,
  paneIndex,
  dirtyTabs,
  onActivate,
  onClose,
  onDropTab
}: TabBarProps): React.JSX.Element {
  return (
    <div
      className="tab-bar"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-merkzeug-tab')) e.preventDefault()
      }}
      onDrop={(e) => {
        const data = e.dataTransfer.getData('application/x-merkzeug-tab')
        if (!data) return
        const { tabId, pane } = JSON.parse(data) as { tabId: string; pane: number }
        if (pane !== paneIndex) onDropTab(tabId, pane)
      }}
    >
      {tabs.map((tab) => {
        const title =
          tab.kind === 'folder'
            ? `📁 ${basename(tab.path)}`
            : basename(tab.path, '.md')
        return (
          <div
            key={tab.id}
            className={`tab${tab.id === activeTabId ? ' active' : ''}`}
            title={tab.path}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'application/x-merkzeug-tab',
                JSON.stringify({ tabId: tab.id, pane: paneIndex })
              )
            }}
            onClick={() => onActivate(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onClose(tab.id)
            }}
          >
            {tab.navMode && <span className="tab-nav-badge" title={translate("Navigation mode")}>📖</span>}
            <span className="tab-title">{title}</span>
            {dirtyTabs.has(tab.id) && <span className="tab-dirty">•</span>}
            <button
              className="tab-close"
              title={translate("Close Tab")}
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.id)
              }}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

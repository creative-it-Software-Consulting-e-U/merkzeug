import { t as translate } from '@merkzeug/core/i18n'
export interface SheetAction {
  label: string
  danger?: boolean
  onSelect: () => void
}

interface SheetProps {
  title?: string
  actions: SheetAction[]
  onClose: () => void
}

/** Einfaches Action-Sheet von unten, wie das native iOS-Pendant. */
export function Sheet({ title, actions, onClose }: SheetProps): React.JSX.Element {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {title && <div className="sheet-title">{title}</div>}
        {actions.map((action) => (
          <button
            key={action.label}
            className={`sheet-btn${action.danger ? ' danger' : ''}`}
            onClick={() => {
              onClose()
              action.onSelect()
            }}
          >
            {action.label}
          </button>
        ))}
        <button className="sheet-btn sheet-cancel" onClick={onClose}>
          {translate("Cancel")}
        </button>
      </div>
    </div>
  )
}

import { PlusIcon } from '../../../shared/ui/icons'
import { GHOST_BTN_MD, ICON_BTN } from '../../../shared/ui/styles'
import { PencilIcon } from './icons'
import type { NvxGroup } from '../types'

type GroupBarProps = {
  groups: NvxGroup[]
  activeId: string | null
  onSelect: (groupId: string) => void
  onAdd: () => void
  onEdit: () => void
}

/** The groups as tabs along the top: pick the family of devices to work with. */
export function GroupBar({ groups, activeId, onSelect, onAdd, onEdit }: GroupBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="bg-subtle border-line flex flex-wrap gap-1 rounded-xl border p-1" role="group" aria-label="Device groups">
        {groups.map((group) => {
          const active = group.id === activeId
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(group.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                active ? 'bg-brand text-on-brand shadow-card' : 'text-ink-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {group.name}
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-black/15' : 'bg-line text-ink-muted'}`}>{group.units.length}</span>
            </button>
          )
        })}
      </div>
      <button type="button" className={GHOST_BTN_MD} onClick={onAdd}>
        <PlusIcon className="h-4 w-4" />
        Group
      </button>
      {activeId && (
        <button type="button" className={ICON_BTN} aria-label="Rename or delete this group" title="Rename or delete this group" onClick={onEdit}>
          <PencilIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

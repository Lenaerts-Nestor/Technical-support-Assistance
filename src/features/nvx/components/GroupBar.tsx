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
      <div className="border-line flex flex-wrap rounded-lg border p-0.5" role="group" aria-label="Device groups">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            aria-pressed={group.id === activeId}
            onClick={() => onSelect(group.id)}
            className={`rounded-md px-3.5 py-1 text-xs font-semibold tracking-wide uppercase transition-colors ${
              group.id === activeId ? 'bg-brand text-on-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {group.name}
          </button>
        ))}
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

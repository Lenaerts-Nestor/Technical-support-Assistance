import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { PencilIcon } from './icons'
import type { NvxUnit } from '../types'

type UnitsCardProps = {
  units: NvxUnit[]
  selectedId: string | undefined
  onSelect: (unitId: string) => void
  onAdd: () => void
  onEdit: (unit: NvxUnit) => void
}

/** The devices of the group. The selected one is where calls run. */
export function UnitsCard({ units, selectedId, onSelect, onAdd, onEdit }: UnitsCardProps) {
  return (
    <section className={CARD} aria-label="Units">
      <header className={CARD_HEADER}>
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Units <span className={COUNT_BADGE}>{units.length}</span>
        </h3>
        <button type="button" className={GHOST_BTN} onClick={onAdd}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </header>
      {units.length === 0 ? (
        <p className="text-ink-muted px-4 py-6 text-center text-sm">No units yet. Add the IP address of a device.</p>
      ) : (
        <ul className="divide-line-soft divide-y">
          {units.map((unit) => {
            const selected = unit.id === selectedId
            return (
              <li
                key={unit.id}
                className={`flex items-center gap-1 border-l-2 pr-2 transition-colors ${
                  selected ? 'border-brand bg-brand-soft' : 'hover:bg-subtle border-transparent'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(unit.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="text-ink block truncate text-sm font-medium">{unit.label || unit.ip}</span>
                    <span className="text-ink-muted block font-mono text-xs">{unit.ip}</span>
                  </span>
                </button>
                <button type="button" className={ICON_BTN} aria-label={`Edit ${unit.label || unit.ip}`} onClick={() => onEdit(unit)}>
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

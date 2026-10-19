import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { ChevronIcon, PencilIcon } from './icons'
import type { NvxUnit } from '../types'

type UnitsPanelProps = {
  units: NvxUnit[]
  selectedIds: ReadonlySet<string>
  onToggleUnit: (unitId: string) => void
  onSelectAll: (on: boolean) => void
  onAddUnit: () => void
  onEditUnit: (unit: NvxUnit) => void
  open: boolean
  onToggle: () => void
}

/**
 * The group's units, in a panel that folds down to one line. Tick one unit or several: requests
 * run on every ticked unit.
 */
export function UnitsPanel({ units, selectedIds, onToggleUnit, onSelectAll, onAddUnit, onEditUnit, open, onToggle }: UnitsPanelProps) {
  const picked = units.filter((u) => selectedIds.has(u.id))
  const summary =
    picked.length === 0 ? 'none ticked' : picked.length <= 4 ? picked.map((u) => u.label || u.ip).join(', ') : `${picked.length} ticked`

  return (
    <section className={CARD} aria-label="Units">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" aria-expanded={open} onClick={onToggle} className="text-ink hover:text-brand flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronIcon open={open} />
          <span className={`${SECTION_LABEL} flex items-center gap-2`}>
            Units <span className={COUNT_BADGE}>{units.length}</span>
          </span>
          {!open && <span className="text-ink-muted min-w-0 truncate text-sm">{summary}</span>}
        </button>
        {open && units.length > 1 && (
          <span className="text-ink-muted flex gap-3 text-xs">
            <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => onSelectAll(true)}>
              Select all
            </button>
            <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => onSelectAll(false)}>
              None
            </button>
          </span>
        )}
        <button type="button" className={GHOST_BTN} onClick={onAddUnit}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add unit
        </button>
      </div>
      {open && (
        <div className="border-line-soft border-t p-3">
          {units.length === 0 ? (
            <p className="text-ink-muted px-1 py-2 text-sm">No units yet. Add the IP address of a device.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {units.map((unit) => {
                const selected = selectedIds.has(unit.id)
                return (
                  <li
                    key={unit.id}
                    className={`flex items-center gap-2 rounded-lg border py-0.5 pr-1.5 pl-3 transition-colors ${
                      selected ? 'border-brand-line bg-brand-soft' : 'border-line hover:bg-subtle'
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5">
                      <input type="checkbox" className="accent-brand h-4 w-4 shrink-0" checked={selected} onChange={() => onToggleUnit(unit.id)} />
                      <span className="min-w-0">
                        <span className="text-ink block truncate text-sm font-semibold">{unit.label || unit.ip}</span>
                        <span className="text-ink-muted block font-mono text-xs">{unit.ip}</span>
                      </span>
                    </label>
                    <button type="button" className={ICON_BTN} aria-label={`Edit ${unit.label || unit.ip}`} onClick={() => onEditUnit(unit)}>
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

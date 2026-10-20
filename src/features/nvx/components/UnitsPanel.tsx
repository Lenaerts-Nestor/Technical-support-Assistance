import type { ReactNode } from 'react'
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
  /** The login fields, which stay in the header even when the units are folded away. */
  login: ReactNode
}

/**
 * Connection card: the group's units as pills to tick (requests run on every ticked unit) and the
 * group's login in the same header. Folds down to one line; the login stays within reach.
 */
export function UnitsPanel({ units, selectedIds, onToggleUnit, onSelectAll, onAddUnit, onEditUnit, open, onToggle, login }: UnitsPanelProps) {
  const picked = units.filter((u) => selectedIds.has(u.id))
  const summary =
    picked.length === 0 ? 'none ticked' : picked.length <= 3 ? picked.map((u) => u.label || u.ip).join(', ') : `${picked.length} ticked`

  return (
    <section className={CARD} aria-label="Units">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <button type="button" aria-expanded={open} onClick={onToggle} className="text-ink hover:text-brand flex min-w-0 items-center gap-2.5 text-left">
          <ChevronIcon open={open} />
          <span className={`${SECTION_LABEL} flex items-center gap-2`}>
            Units <span className={COUNT_BADGE}>{units.length}</span>
          </span>
          {!open && <span className="text-ink-muted max-w-[16rem] truncate text-sm">{summary}</span>}
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {login}
          <button type="button" className={GHOST_BTN} onClick={onAddUnit}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add unit
          </button>
        </div>
      </div>
      {open && (
        <div className="border-line-soft border-t px-4 py-3">
          {units.length === 0 ? (
            <p className="text-ink-muted py-1 text-sm">No units yet. Add the IP address of a device.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {units.map((unit) => {
                const selected = selectedIds.has(unit.id)
                return (
                  <div
                    key={unit.id}
                    className={`group flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-3 transition-colors ${
                      selected ? 'border-brand-line bg-brand-soft' : 'border-line hover:bg-subtle'
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2.5 py-1">
                      <input type="checkbox" className="accent-brand h-3.5 w-3.5 shrink-0" checked={selected} onChange={() => onToggleUnit(unit.id)} />
                      <span className="text-ink text-sm font-semibold">{unit.label || unit.ip}</span>
                      {unit.label && <span className="text-ink-muted font-mono text-xs">{unit.ip}</span>}
                    </label>
                    <button
                      type="button"
                      className={`${ICON_BTN} border-transparent bg-transparent opacity-0 group-focus-within:opacity-100 group-hover:opacity-100`}
                      aria-label={`Edit ${unit.label || unit.ip}`}
                      onClick={() => onEditUnit(unit)}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
              {units.length > 1 && (
                <span className="text-ink-muted ml-2 flex gap-3 text-xs">
                  <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => onSelectAll(true)}>
                    Select all
                  </button>
                  <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => onSelectAll(false)}>
                    None
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

import type { ReactNode } from 'react'
import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { CheckIcon, ChevronIcon, PencilIcon } from './icons'
import { StatusChip, StepHeader } from './StepHeader'
import type { NvxUnit } from '../types'

/** One thing a request needs before it can be sent: a unit, a username, a password. */
export type Requirement = {
  id: 'unit' | 'username' | 'password'
  label: string
  met: boolean
  /** What is set (shown on a ticked item) or what to do (shown on a missing one). */
  detail: string
}

type UnitsPanelProps = {
  units: NvxUnit[]
  selectedIds: ReadonlySet<string>
  onToggleUnit: (unitId: string) => void
  onSelectAll: (on: boolean) => void
  onAddUnit: () => void
  onEditUnit: (unit: NvxUnit) => void
  open: boolean
  onToggle: () => void
  /** The login fields, which stay visible even when the units are folded away. */
  login: ReactNode
  /** What a request needs, in the order to do it. */
  requirements: Requirement[]
  /** Move the cursor to the first thing still missing (or to a given one). */
  onFix: (id: Requirement['id']) => void
}

/**
 * Step 1, Connect: which units to run on (pills to tick), the login for them, and a
 * "before you send" checklist that names what is still missing and jumps to it.
 * The units fold down to one line; the login stays within reach.
 */
export function UnitsPanel({ units, selectedIds, onToggleUnit, onSelectAll, onAddUnit, onEditUnit, open, onToggle, login, requirements, onFix }: UnitsPanelProps) {
  const picked = units.filter((u) => selectedIds.has(u.id))
  const summary =
    picked.length === 0 ? 'none ticked' : picked.length <= 3 ? picked.map((u) => u.label || u.ip).join(', ') : `${picked.length} ticked`
  const missing = requirements.filter((r) => !r.met).length

  return (
    <section className={CARD} aria-label="Connect">
      <StepHeader
        step={1}
        title="Connect"
        state={missing === 0 ? 'done' : 'next'}
        status={missing === 0 ? <StatusChip tone="ok">Ready to send</StatusChip> : <StatusChip tone="warn">{missing} to do</StatusChip>}
      >
        <button type="button" className={GHOST_BTN} onClick={onAddUnit} data-nvx-focus={units.length === 0 ? 'unit' : undefined}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add unit
        </button>
      </StepHeader>

      <div className="space-y-4 p-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" aria-expanded={open} onClick={onToggle} className="text-ink hover:text-brand flex min-w-0 items-center gap-2 text-left">
              <ChevronIcon open={open} />
              <span className={`${SECTION_LABEL} flex items-center gap-2`}>
                Units <span className={COUNT_BADGE}>{units.length}</span>
              </span>
              {!open && <span className="text-ink-muted max-w-[16rem] truncate text-sm">{summary}</span>}
            </button>
            {open && units.length > 1 && (
              <span className="text-ink-soft flex gap-3 text-xs font-semibold">
                <button type="button" className="hover:text-brand underline-offset-2 hover:underline" onClick={() => onSelectAll(true)}>
                  Select all
                </button>
                <button type="button" className="hover:text-brand underline-offset-2 hover:underline" onClick={() => onSelectAll(false)}>
                  None
                </button>
              </span>
            )}
          </div>
          {open &&
            (units.length === 0 ? (
              <p className="text-ink-muted text-sm">No units yet. Add the IP address of a device.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {units.map((unit, index) => {
                  const selected = selectedIds.has(unit.id)
                  return (
                    <div
                      key={unit.id}
                      className={`group flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-3 transition-colors ${
                        selected ? 'border-brand-line bg-brand-soft' : 'border-line-strong bg-field/40 hover:bg-subtle'
                      }`}
                    >
                      <label className="flex cursor-pointer items-center gap-2.5 py-1">
                        <input
                          type="checkbox"
                          className="accent-brand h-3.5 w-3.5 shrink-0"
                          checked={selected}
                          onChange={() => onToggleUnit(unit.id)}
                          data-nvx-focus={index === 0 ? 'unit' : undefined}
                        />
                        <span className="text-ink text-sm font-semibold">{unit.label || unit.ip}</span>
                        {unit.label && <span className="text-ink-muted font-mono text-xs">{unit.ip}</span>}
                      </label>
                      <button
                        type="button"
                        className={`${ICON_BTN} border-transparent bg-transparent opacity-0 shadow-none group-focus-within:opacity-100 group-hover:opacity-100`}
                        aria-label={`Edit ${unit.label || unit.ip}`}
                        onClick={() => onEditUnit(unit)}
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>

        {login}
      </div>

      <ul aria-label="Before you send" className="border-line flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <li className="text-ink-muted mr-1 text-[11px] font-bold tracking-[0.1em] uppercase">Before you send</li>
        {requirements.map((item) => (
          <li key={item.id}>
            {item.met ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                <CheckIcon className="h-3 w-3" />
                {item.label}
                {item.detail && <span className="max-w-[12rem] truncate font-normal text-emerald-200/75">· {item.detail}</span>}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFix(item.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/25"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                {item.detail}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

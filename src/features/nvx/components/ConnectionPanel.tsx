import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, COUNT_BADGE, GHOST_BTN, ICON_BTN, INPUT, SECTION_LABEL } from '../../../shared/ui/styles'
import { PencilIcon, PlayIcon } from './icons'
import type { NvxUnit } from '../types'

type ConnectionPanelProps = {
  units: NvxUnit[]
  selectedIds: ReadonlySet<string>
  onToggleUnit: (unitId: string) => void
  onSelectAll: (on: boolean) => void
  onAddUnit: () => void
  onEditUnit: (unit: NvxUnit) => void
  onOpenStream: (unit: NvxUnit) => void
  username: string
  password: string
  onUsername: (username: string) => void
  onPassword: (password: string) => void
  open: boolean
  onToggle: () => void
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/**
 * The units to run on and the login, in one panel at the top that folds down to a single line.
 * Tick one unit or several: calls run on every ticked unit.
 */
export function ConnectionPanel(props: ConnectionPanelProps) {
  const { units, selectedIds, open, onToggle } = props
  const picked = units.filter((u) => selectedIds.has(u.id))
  const summary =
    picked.length === 0
      ? 'No unit selected'
      : picked.length <= 3
        ? picked.map((u) => u.label || u.ip).join(', ')
        : `${picked.length} units selected`

  return (
    <section className={CARD} aria-label="Units and login">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="text-ink hover:text-brand flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronIcon open={open} />
          <span className={SECTION_LABEL}>Units &amp; login</span>
          {!open && (
            <span className="text-ink-muted min-w-0 truncate text-sm">
              {summary} · {props.username || 'no username'} · {props.password ? 'password set' : 'no password yet'}
            </span>
          )}
        </button>
        {open && (
          <button type="button" className={GHOST_BTN} onClick={props.onAddUnit}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add unit
          </button>
        )}
      </div>

      {open && (
        <div className="border-line-soft grid gap-6 border-t p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
                Units <span className={COUNT_BADGE}>{units.length}</span>
              </h3>
              {units.length > 1 && (
                <span className="text-ink-muted ml-auto flex gap-3 text-xs">
                  <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => props.onSelectAll(true)}>
                    Select all
                  </button>
                  <button type="button" className="hover:text-ink underline-offset-2 hover:underline" onClick={() => props.onSelectAll(false)}>
                    None
                  </button>
                </span>
              )}
            </div>
            {units.length === 0 ? (
              <p className="text-ink-muted text-sm">No units yet. Add the IP address of a device.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {units.map((unit) => {
                  const selected = selectedIds.has(unit.id)
                  return (
                    <li
                      key={unit.id}
                      className={`flex items-center gap-2 rounded-lg border py-1 pr-1.5 pl-3 transition-colors ${
                        selected ? 'border-brand-line bg-brand-soft' : 'border-line hover:bg-subtle'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5">
                        <input type="checkbox" className="accent-brand h-4 w-4 shrink-0" checked={selected} onChange={() => props.onToggleUnit(unit.id)} />
                        <span className="min-w-0">
                          <span className="text-ink block truncate text-sm font-semibold">{unit.label || unit.ip}</span>
                          <span className="text-ink-muted block font-mono text-xs">{unit.ip}</span>
                        </span>
                      </label>
                      {unit.streamUrl && (
                        <button type="button" className={ICON_BTN} aria-label={`Open the stream of ${unit.label || unit.ip}`} title={`Open ${unit.streamUrl} in VLC`} onClick={() => props.onOpenStream(unit)}>
                          <PlayIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" className={ICON_BTN} aria-label={`Edit ${unit.label || unit.ip}`} onClick={() => props.onEditUnit(unit)}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className={SECTION_LABEL}>Login for this group</h3>
            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs font-medium">Username</span>
              <input className={INPUT} value={props.username} autoComplete="off" spellCheck={false} onChange={(e) => props.onUsername(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs font-medium">Password</span>
              <input className={INPUT} type="password" value={props.password} autoComplete="off" onChange={(e) => props.onPassword(e.target.value)} />
            </label>
            <p className="text-ink-faint text-xs">The password is kept in memory only and is gone when the app closes.</p>
          </div>
        </div>
      )}
    </section>
  )
}

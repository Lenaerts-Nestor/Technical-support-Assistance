import { CARD, CARD_HEADER, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { PencilIcon, PlayIcon } from './icons'
import type { NvxCall } from '../types'

type CallsCardProps = {
  calls: NvxCall[]
  /** Why nothing can run right now, or `null` when it can. */
  blockedReason: string | null
  running: boolean
  /** How many units a click will run on. */
  unitCount: number
  onRun: (call: NvxCall) => void
  onRunAll: () => void
  onEdit: (call: NvxCall) => void
}

/** The saved calls as tiles: one click runs a call on the ticked units, "Run all" gathers every call into one report. */
export function CallsCard({ calls, blockedReason, running, unitCount, onRun, onRunAll, onEdit }: CallsCardProps) {
  const disabled = blockedReason !== null || running
  return (
    <section className={CARD} aria-label="Saved calls">
      <header className={CARD_HEADER}>
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Saved calls <span className={COUNT_BADGE}>{calls.length}</span>
          {unitCount > 1 && <span className="text-ink-muted font-normal tracking-normal normal-case">· runs on {unitCount} units</span>}
        </h3>
        <button type="button" className={GHOST_BTN} disabled={disabled || calls.length === 0} onClick={onRunAll}>
          <PlayIcon className="h-3.5 w-3.5" />
          Run all
        </button>
      </header>
      {blockedReason && <p className="text-ink-muted border-line-soft border-b px-4 py-2.5 text-sm">{blockedReason}</p>}
      {calls.length === 0 ? (
        <p className="text-ink-muted px-4 py-6 text-center text-sm">
          No saved calls yet. Try a path in the explorer below, then save it with a title.
        </p>
      ) : (
        <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {calls.map((call) => (
            <li key={call.id} className="border-line hover:border-line-strong flex items-stretch rounded-lg border bg-subtle/40 transition-colors">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRun(call)}
                className="hover:bg-subtle flex min-w-0 flex-1 items-center gap-3 rounded-l-lg px-3.5 py-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <PlayIcon className="text-brand h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="text-ink block truncate text-[15px] font-semibold">{call.title}</span>
                  <span className="text-ink-muted block truncate font-mono text-xs">{call.path}</span>
                </span>
              </button>
              <button type="button" className={`${ICON_BTN} m-2 self-start`} aria-label={`Edit ${call.title}`} onClick={() => onEdit(call)}>
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

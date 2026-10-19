import { CARD, CARD_HEADER, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { PencilIcon, PlayIcon } from './icons'
import type { NvxCall } from '../types'

type CallsCardProps = {
  calls: NvxCall[]
  /** Why nothing can run right now, or `null` when it can. */
  blockedReason: string | null
  running: boolean
  onRun: (call: NvxCall) => void
  onRunAll: () => void
  onEdit: (call: NvxCall) => void
}

/** The saved calls: one click runs a call on the selected unit, "Run all" gathers them in one report. */
export function CallsCard({ calls, blockedReason, running, onRun, onRunAll, onEdit }: CallsCardProps) {
  const disabled = blockedReason !== null || running
  return (
    <section className={CARD} aria-label="Saved calls">
      <header className={CARD_HEADER}>
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Saved calls <span className={COUNT_BADGE}>{calls.length}</span>
        </h3>
        <button type="button" className={GHOST_BTN} disabled={disabled || calls.length === 0} onClick={onRunAll}>
          <PlayIcon className="h-3.5 w-3.5" />
          Run all
        </button>
      </header>
      {blockedReason && <p className="text-ink-muted border-line-soft border-b px-4 py-2 text-xs">{blockedReason}</p>}
      {calls.length === 0 ? (
        <p className="text-ink-muted px-4 py-6 text-center text-sm">
          No saved calls yet. Try a path in the explorer below, then save it with a title.
        </p>
      ) : (
        <ul className="divide-line-soft divide-y">
          {calls.map((call) => (
            <li key={call.id} className="flex items-center gap-1 pr-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRun(call)}
                className="hover:bg-subtle flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <PlayIcon className="text-brand h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="text-ink block truncate text-sm font-medium">{call.title}</span>
                  <span className="text-ink-muted block truncate font-mono text-xs">GET {call.path}</span>
                </span>
              </button>
              <button type="button" className={ICON_BTN} aria-label={`Edit ${call.title}`} onClick={() => onEdit(call)}>
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

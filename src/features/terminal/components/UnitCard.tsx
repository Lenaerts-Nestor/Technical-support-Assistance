import type { Unit } from '../types'
import { CARD, CHIP, GHOST_BTN, PRIMARY_BTN } from '../../../shared/ui/styles'
import { TerminalIcon } from './icons'

type UnitCardProps = {
  unit: Unit
  /** Terminals currently open on this unit. */
  openCount: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function UnitCard({ unit, openCount, onOpen, onEdit, onDelete }: UnitCardProps) {
  return (
    <div className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-ink truncate text-sm font-semibold">{unit.name}</h3>
          <p className="text-ink-muted mt-0.5 font-mono text-xs">
            {unit.host}
            {unit.port !== 22 && `:${unit.port}`}
          </p>
        </div>
        {unit.model && <span className={CHIP}>{unit.model}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className={`${PRIMARY_BTN} px-3 py-1.5 text-xs`}>
          <TerminalIcon className="h-3.5 w-3.5" />
          Open terminal
        </button>
        {openCount > 0 && (
          <span className="text-ink-faint text-[11px]">{openCount} open</span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={onEdit} className={GHOST_BTN}>
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`${GHOST_BTN} hover:border-rose-500/50 hover:text-rose-300`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

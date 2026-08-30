import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { CHIP, ICON_BTN } from './fieldStyles'

type PartFrameProps = {
  chip: string
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  children: ReactNode
}

/** Shared shell for a top-level guide block: type chip + reorder / delete controls. */
export function PartFrame({ chip, index, count, onMove, onRemove, children }: PartFrameProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={CHIP}>{chip}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move block up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move block down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete block"
          className="text-slate-400 hover:text-rose-600"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </section>
  )
}

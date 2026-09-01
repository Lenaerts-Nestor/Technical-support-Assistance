import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { PART_TONES } from '../guidesData'
import { DELETE_BTN, ICON_BTN } from '../../../shared/ui/styles'
import type { GuidePartKind } from '../types'

type BlockFrameProps = {
  kind: GuidePartKind
  chip: string
  index: number
  count: number
  /** Nested blocks sit inside a chapter/section card, so they drop a level of weight. */
  nested?: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  children: ReactNode
}

/**
 * Shared shell for one editable block — a top-level part, or a table / callout /
 * term nested inside a chapter or section. The coloured chip and left rule are
 * what separate an H2 chapter from an H3 section at a glance while editing.
 */
export function BlockFrame({
  kind,
  chip,
  index,
  count,
  nested = false,
  onMove,
  onRemove,
  children,
}: BlockFrameProps) {
  const tone = PART_TONES[kind]

  return (
    <section
      className={`border-l-[3px] ${tone.rule} ${
        nested
          ? 'border-line bg-canvas rounded-lg border'
          : 'border-line-strong bg-surface shadow-card rounded-xl border'
      }`}
    >
      <div
        className={`border-line-soft bg-subtle flex items-center gap-2 border-b px-3 py-2 ${
          nested ? 'rounded-tr-lg' : 'rounded-tr-xl'
        }`}
      >
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${tone.chip}`}
        >
          {chip}
        </span>
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
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className={nested ? 'p-3' : 'p-4'}>{children}</div>
    </section>
  )
}

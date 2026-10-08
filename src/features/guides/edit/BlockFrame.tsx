import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, TrashIcon } from '../components/icons'
import { PART_TONES } from '../guidesData'
import { DELETE_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { dropLineClass, useSortable } from './sortable'
import type { DropPos } from '../useGuideDraft'
import type { GuidePartKind } from '../types'

/** Where a block sits in a reorderable list, and what a drop onto it does. */
export type Reorder = {
  /** Identifies the list, so a drag never lands in a different one. */
  list: string
  onDrop: (fromId: string, targetId: string, pos: DropPos) => void
}

type BlockFrameProps = {
  id: string
  kind: GuidePartKind
  chip: string
  /** One line shown in the header while the block is folded up. */
  summary: string
  index: number
  count: number
  /** Nested blocks sit inside a chapter/section card, so they drop a level of weight. */
  nested?: boolean
  reorder?: Reorder
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  children: ReactNode
}

/**
 * Shared shell for one editable block — a top-level part, or a table / callout /
 * term nested inside a chapter or section. The coloured chip and left rule are
 * what separate an H2 chapter from an H3 section at a glance while editing. The
 * header carries everything about the block as a whole: drag handle, fold,
 * arrows and delete.
 */
export function BlockFrame({
  id,
  kind,
  chip,
  summary,
  index,
  count,
  nested = false,
  reorder,
  onMove,
  onRemove,
  children,
}: BlockFrameProps) {
  const tone = PART_TONES[kind]
  const ui = useEditorUi()
  const collapsed = ui.collapsed.has(id)
  const fresh = ui.justAdded === id
  const active = !nested && ui.activeId === id
  const sort = useSortable(reorder?.list ?? `solo:${id}`, id, reorder?.onDrop ?? (() => {}), summary || chip)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [fresh])

  return (
    <section
      ref={ref}
      {...(reorder ? sort.itemProps : {})}
      onFocusCapture={() => !nested && ui.setActiveId(id)}
      onPointerDownCapture={() => !nested && ui.setActiveId(id)}
      className={`relative border-l-[3px] transition-shadow ${tone.rule} ${
        nested
          ? 'border-line bg-canvas rounded-lg border'
          : 'border-line-strong bg-surface shadow-card rounded-xl border'
      } ${sort.dragging ? 'opacity-40' : ''} ${
        fresh ? 'ring-brand/70 ring-2' : active ? 'ring-brand-line ring-1' : ''
      }`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <div
        className={`border-line-soft bg-subtle flex items-center gap-2 px-3 py-2 ${
          collapsed ? '' : 'border-b'
        } ${nested ? 'rounded-tr-lg' : 'rounded-tr-xl'} ${collapsed ? (nested ? 'rounded-br-lg' : 'rounded-br-xl') : ''}`}
      >
        {reorder && <GripHandle handleProps={sort.handleProps} label="Drag handle" />}
        <button
          type="button"
          onClick={() => ui.toggleCollapsed(id)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand block' : 'Collapse block'}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="text-ink-faint hover:text-ink rounded p-0.5"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${tone.chip}`}
        >
          {chip}
        </span>
        {collapsed ? (
          <button
            type="button"
            onClick={() => ui.toggleCollapsed(id)}
            className="text-ink min-w-0 flex-1 truncate text-left text-sm font-medium"
          >
            {summary || <span className="text-ink-faint font-normal">Untitled</span>}
          </button>
        ) : (
          <span className="flex-1" />
        )}
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
          title="Delete block"
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      {/* Hidden rather than unmounted, so folding a block keeps what was typed and its panel state. */}
      <div hidden={collapsed} className={nested ? 'p-3.5' : 'p-4'}>
        {children}
      </div>
    </section>
  )
}

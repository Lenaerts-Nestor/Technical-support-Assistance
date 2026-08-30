import { ArrowDownIcon, ArrowUpIcon, XIcon } from '../components/icons'
import { ICON_BTN, INPUT } from './fieldStyles'
import type { StepSubItem, SubItemKind } from '../types'

type SubItemEditProps = {
  item: StepSubItem
  canUp: boolean
  canDown: boolean
  onChange: (fields: { text?: string; kind?: SubItemKind }) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}

/** One row under a step: a plain bullet, or an Info / Warning note with a variant select. */
export function SubItemEdit({
  item,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
}: SubItemEditProps) {
  const isNote = item.kind !== 'bullet'

  return (
    <div className="flex items-center gap-1.5 pl-6">
      <span aria-hidden className="text-slate-300">
        {isNote ? '◎' : '•'}
      </span>

      {isNote && (
        <select
          value={item.kind}
          onChange={(e) => onChange({ kind: e.target.value as SubItemKind })}
          className="rounded-md border border-slate-200 px-1.5 py-1.5 text-xs text-slate-600 focus:outline-none"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
        </select>
      )}

      <input
        value={item.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={isNote ? 'Note text…' : 'Bullet point…'}
        className={INPUT}
      />

      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={!canUp}
        aria-label="Move up"
        className={ICON_BTN}
      >
        <ArrowUpIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={!canDown}
        aria-label="Move down"
        className={ICON_BTN}
      >
        <ArrowDownIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="text-slate-400 hover:text-rose-600"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

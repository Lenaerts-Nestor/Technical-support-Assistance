import type { KeyboardEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '../components/icons'
import { DELETE_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { AutoTextarea, SELECT } from './fields'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { dropLineClass, listKey, useSortable } from './sortable'
import type { GuideDraftController, StepLoc } from '../useGuideDraft'
import type { StepSubItem, SubItemKind } from '../types'

type SubItemEditProps = {
  loc: StepLoc
  stepId: string
  item: StepSubItem
  index: number
  count: number
  d: GuideDraftController
}

/** One row under a step: a bullet, or an Info / Warning note. The select switches between them. */
export function SubItemEdit({ loc, stepId, item, index, count, d }: SubItemEditProps) {
  const ui = useEditorUi()
  const isNote = item.kind !== 'bullet'
  const fresh = ui.justAdded === item.id
  const sort = useSortable(
    listKey('sub', loc.partId, loc.sectionId, stepId),
    item.id,
    (from, target, pos) => d.moveSubItemTo(loc, stepId, from, target, pos),
    item.text || (isNote ? 'Note' : 'Bullet'),
  )

  // Enter at the end of a filled-in row starts the next one of the same kind.
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    const el = e.currentTarget
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length
    if (!atEnd || !item.text.trim()) return
    e.preventDefault()
    ui.flashAdded(d.addSubItem(loc, stepId, item.kind, index + 1))
  }

  return (
    <div
      {...sort.itemProps}
      className={`relative flex items-start gap-2 ${sort.dragging ? 'opacity-40' : ''} ${
        fresh ? 'ring-brand/60 rounded-lg ring-2' : ''
      }`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <GripHandle handleProps={sort.handleProps} label="Drag item" className="mt-2.5" />
      <select
        value={item.kind}
        onChange={(e) => d.updateSubItem(loc, stepId, item.id, { kind: e.target.value as SubItemKind })}
        aria-label="Kind of item"
        className={`${SELECT} w-40 shrink-0`}
      >
        <option value="bullet">• Bullet</option>
        <option value="info">ⓘ Info note</option>
        <option value="warning">⚠ Warning note</option>
      </select>

      <AutoTextarea
        value={item.text}
        onChange={(e) => d.updateSubItem(loc, stepId, item.id, { text: e.target.value })}
        onKeyDown={onKey}
        autoFocus={fresh}
        aria-label={isNote ? 'Note text' : 'Bullet text'}
        placeholder={isNote ? 'Note text…' : 'Bullet point…  (Enter = next bullet)'}
      />

      <div className="mt-1.5 flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => d.moveSubItem(loc, stepId, item.id, -1)}
          disabled={index === 0}
          aria-label="Move up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => d.moveSubItem(loc, stepId, item.id, 1)}
          disabled={index === count - 1}
          aria-label="Move down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => d.removeSubItem(loc, stepId, item.id)}
          aria-label="Remove"
          className={`${DELETE_BTN} p-1`}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

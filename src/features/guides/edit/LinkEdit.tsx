import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { DELETE_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { Field, INPUT } from './fields'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { dropLineClass, useSortable } from './sortable'
import type { GuideDraftController } from '../useGuideDraft'
import type { GuideLink } from '../types'

type LinkEditProps = {
  link: GuideLink
  index: number
  count: number
  d: GuideDraftController
}

export function LinkEdit({ link, index, count, d }: LinkEditProps) {
  const fresh = useEditorUi().justAdded === link.id
  const sort = useSortable('links', link.id, d.moveLinkTo, link.title || `Link ${index + 1}`)
  const onChange = (fields: Partial<Omit<GuideLink, 'id'>>) => d.updateLink(link.id, fields)

  return (
    <div
      {...sort.itemProps}
      className={`border-line bg-canvas relative rounded-lg border p-3 ${sort.dragging ? 'opacity-40' : ''} ${
        fresh ? 'ring-brand/60 ring-2' : ''
      }`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <div className="mb-2.5 flex items-center gap-1.5">
        <GripHandle handleProps={sort.handleProps} label="Drag link" />
        <span className="text-ink-muted text-xs font-semibold">Link {index + 1}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => d.moveLink(link.id, -1)}
          disabled={index === 0}
          aria-label="Move link up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => d.moveLink(link.id, 1)}
          disabled={index === count - 1}
          aria-label="Move link down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => d.removeLink(link.id)}
          aria-label="Delete link"
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2.5">
        <Field label="Title">
          <input
            value={link.title}
            onChange={(e) => onChange({ title: e.target.value })}
            autoFocus={fresh}
            placeholder="e.g. NVX product page"
            className={INPUT}
          />
        </Field>
        <Field label="Address (URL)">
          <input
            value={link.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://…"
            className={INPUT}
          />
        </Field>
        <Field label="Description" hint="optional">
          <input
            value={link.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What the reader will find there…"
            className={INPUT}
          />
        </Field>
      </div>
    </div>
  )
}

import { AutoTextarea, Field, SELECT } from './fields'
import { BlockFrame } from './BlockFrame'
import { useFresh } from './editorUi'
import type { BlockEditProps } from './blockEditProps'
import type { CalloutPart, CalloutVariant } from '../types'

export function CalloutEdit({
  part,
  addr,
  index,
  count,
  nested,
  reorder,
  onMove,
  onRemove,
  d,
}: BlockEditProps<CalloutPart>) {
  const fresh = useFresh(part.id)
  return (
    <BlockFrame
      id={part.id}
      kind="callout"
      chip={part.variant === 'warning' ? 'Callout · Warning' : 'Callout · Info'}
      summary={part.text.split('\n')[0] || 'Empty callout'}
      index={index}
      count={count}
      nested={nested}
      reorder={reorder}
      onMove={onMove}
      onRemove={onRemove}
    >
      <div className="space-y-3.5">
        <Field label="Type">
          <select
            value={part.variant}
            onChange={(e) => d.updateCallout(addr, { variant: e.target.value as CalloutVariant })}
            className={`${SELECT} w-48`}
          >
            <option value="info">ⓘ Info (blue)</option>
            <option value="warning">⚠ Warning (red)</option>
          </select>
        </Field>
        <Field label="Message">
          <AutoTextarea
            value={part.text}
            onChange={(e) => d.updateCallout(addr, { text: e.target.value })}
            autoFocus={fresh}
            placeholder="What the reader needs to know…"
            rows={2}
          />
        </Field>
      </div>
    </BlockFrame>
  )
}

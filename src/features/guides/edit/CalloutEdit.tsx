import { SELECT, TEXTAREA } from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import type { BlockEditProps } from './blockEditProps'
import type { CalloutPart, CalloutVariant } from '../types'

export function CalloutEdit({
  part,
  addr,
  index,
  count,
  nested,
  onMove,
  onRemove,
  d,
}: BlockEditProps<CalloutPart>) {
  return (
    <BlockFrame
      kind="callout"
      chip="Callout"
      index={index}
      count={count}
      nested={nested}
      onMove={onMove}
      onRemove={onRemove}
    >
      <select
        value={part.variant}
        onChange={(e) =>
          d.updateCallout(addr, { variant: e.target.value as CalloutVariant })
        }
        className={`${SELECT} mb-2.5`}
      >
        <option value="info">Info</option>
        <option value="warning">Warning</option>
      </select>
      <textarea
        value={part.text}
        onChange={(e) => d.updateCallout(addr, { text: e.target.value })}
        placeholder="Callout text…"
        rows={2}
        className={TEXTAREA}
      />
    </BlockFrame>
  )
}

import { TEXTAREA } from './fieldStyles'
import { PartFrame } from './PartFrame'
import type { GuideDraftController } from '../useGuideDraft'
import type { CalloutPart, CalloutVariant } from '../types'

type CalloutEditProps = {
  part: CalloutPart
  index: number
  count: number
  d: GuideDraftController
}

export function CalloutEdit({ part, index, count, d }: CalloutEditProps) {
  return (
    <PartFrame
      chip="Callout"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <select
        value={part.variant}
        onChange={(e) =>
          d.updateCallout(part.id, { variant: e.target.value as CalloutVariant })
        }
        className="mb-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:outline-none"
      >
        <option value="info">Info</option>
        <option value="warning">Warning</option>
      </select>
      <textarea
        value={part.text}
        onChange={(e) => d.updateCallout(part.id, { text: e.target.value })}
        placeholder="Callout text…"
        rows={2}
        className={TEXTAREA}
      />
    </PartFrame>
  )
}

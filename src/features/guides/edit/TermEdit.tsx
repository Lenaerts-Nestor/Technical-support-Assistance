import { INPUT, TEXTAREA } from './fieldStyles'
import { PartFrame } from './PartFrame'
import type { GuideDraftController } from '../useGuideDraft'
import type { TermPart } from '../types'

type TermEditProps = {
  part: TermPart
  index: number
  count: number
  d: GuideDraftController
}

export function TermEdit({ part, index, count, d }: TermEditProps) {
  return (
    <PartFrame
      chip="Term"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <input
        value={part.title}
        onChange={(e) => d.updateTerm(part.id, { title: e.target.value })}
        placeholder="Term / definition title…"
        className={`${INPUT} font-semibold`}
      />
      <textarea
        value={part.explanation}
        onChange={(e) => d.updateTerm(part.id, { explanation: e.target.value })}
        placeholder="Explanation (optional)…"
        rows={2}
        className={`${TEXTAREA} mt-2`}
      />
      <textarea
        value={part.bullets.join('\n')}
        onChange={(e) => d.setTermBullets(part.id, e.target.value.split('\n'))}
        placeholder="One bullet per line…"
        rows={3}
        className={`${TEXTAREA} mt-2`}
      />
    </PartFrame>
  )
}

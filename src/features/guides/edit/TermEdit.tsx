import { INPUT_HEADING, SECTION_LABEL, TEXTAREA } from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import type { BlockEditProps } from './blockEditProps'
import type { TermPart } from '../types'

export function TermEdit({
  part,
  addr,
  index,
  count,
  nested,
  onMove,
  onRemove,
  d,
}: BlockEditProps<TermPart>) {
  return (
    <BlockFrame
      kind="term"
      chip="Term"
      index={index}
      count={count}
      nested={nested}
      onMove={onMove}
      onRemove={onRemove}
    >
      <label className={`mb-1.5 block ${SECTION_LABEL}`}>Term</label>
      <input
        value={part.title}
        onChange={(e) => d.updateTerm(addr, { title: e.target.value })}
        placeholder="Term / definition title…"
        className={INPUT_HEADING}
      />
      <textarea
        value={part.explanation}
        onChange={(e) => d.updateTerm(addr, { explanation: e.target.value })}
        placeholder="Explanation (optional)…"
        rows={2}
        className={`${TEXTAREA} mt-2.5`}
      />
      <textarea
        value={part.bullets.join('\n')}
        onChange={(e) => d.setTermBullets(addr, e.target.value.split('\n'))}
        placeholder="One bullet per line…"
        rows={3}
        className={`${TEXTAREA} mt-2`}
      />
    </BlockFrame>
  )
}

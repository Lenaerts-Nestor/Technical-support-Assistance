import { AutoTextarea, Field, INPUT_HEADING } from './fields'
import { BlockFrame } from './BlockFrame'
import { useFresh } from './editorUi'
import type { BlockEditProps } from './blockEditProps'
import type { TermPart } from '../types'

export function TermEdit({
  part,
  addr,
  index,
  count,
  nested,
  reorder,
  onMove,
  onRemove,
  d,
}: BlockEditProps<TermPart>) {
  const fresh = useFresh(part.id)
  return (
    <BlockFrame
      id={part.id}
      kind="term"
      chip="Term"
      summary={part.title || 'Untitled term'}
      index={index}
      count={count}
      nested={nested}
      reorder={reorder}
      onMove={onMove}
      onRemove={onRemove}
    >
      <div className="space-y-3.5">
        <Field label="Term" hint="the word or phrase being defined">
          <input
            value={part.title}
            onChange={(e) => d.updateTerm(addr, { title: e.target.value })}
            autoFocus={fresh}
            placeholder="e.g. NVX"
            className={INPUT_HEADING}
          />
        </Field>
        <Field label="Explanation" hint="optional">
          <AutoTextarea
            value={part.explanation}
            onChange={(e) => d.updateTerm(addr, { explanation: e.target.value })}
            placeholder="What it means, in a sentence or two…"
            rows={2}
          />
        </Field>
        <Field label="Key points" hint="one bullet per line">
          <AutoTextarea
            value={part.bullets.join('\n')}
            onChange={(e) => d.setTermBullets(addr, e.target.value.split('\n'))}
            placeholder={'First key point\nSecond key point'}
            rows={3}
          />
        </Field>
      </div>
    </BlockFrame>
  )
}

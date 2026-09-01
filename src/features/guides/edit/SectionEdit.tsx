import {
  GHOST_BTN,
  INPUT_HEADING,
  SECTION_LABEL,
  TEXTAREA,
} from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import { SectionBlocksEdit } from './SectionBlocksEdit'
import { StepEdit } from './StepEdit'
import type { GuideDraftController } from '../useGuideDraft'
import type { SectionPart } from '../types'

type SectionEditProps = {
  part: SectionPart
  index: number
  count: number
  d: GuideDraftController
}

export function SectionEdit({ part, index, count, d }: SectionEditProps) {
  const loc = { partId: part.id }

  return (
    <BlockFrame
      kind="section"
      chip="H3 · Section"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <label className={`mb-1.5 block ${SECTION_LABEL}`}>Section heading</label>
      <input
        value={part.heading}
        onChange={(e) => d.updateSectionPart(part.id, { heading: e.target.value })}
        placeholder="Section heading (H3)…"
        className={INPUT_HEADING}
      />
      <textarea
        value={part.body}
        onChange={(e) => d.updateSectionPart(part.id, { body: e.target.value })}
        placeholder="Description / body text (optional)…"
        rows={2}
        className={`${TEXTAREA} mt-2.5`}
      />

      <div className="mt-2.5 space-y-2">
        {part.steps.map((step, stepIdx) => (
          <StepEdit
            key={step.id}
            loc={loc}
            step={step}
            index={stepIdx}
            count={part.steps.length}
            d={d}
          />
        ))}
      </div>

      <button type="button" onClick={() => d.addStep(loc)} className={`${GHOST_BTN} mt-2.5`}>
        + Add Step
      </button>

      <SectionBlocksEdit loc={loc} blocks={part.blocks ?? []} d={d} />
    </BlockFrame>
  )
}

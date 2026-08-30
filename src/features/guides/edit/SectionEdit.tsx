import { GHOST_BTN, INPUT, TEXTAREA } from './fieldStyles'
import { PartFrame } from './PartFrame'
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
    <PartFrame
      chip="H3 · Section"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <input
        value={part.heading}
        onChange={(e) => d.updateSectionPart(part.id, { heading: e.target.value })}
        placeholder="Section heading (H3)…"
        className={`${INPUT} font-semibold`}
      />
      <textarea
        value={part.body}
        onChange={(e) => d.updateSectionPart(part.id, { body: e.target.value })}
        placeholder="Description / body text (optional)…"
        rows={2}
        className={`${TEXTAREA} mt-2`}
      />

      <div className="mt-2 space-y-2">
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

      <button type="button" onClick={() => d.addStep(loc)} className={`${GHOST_BTN} mt-2`}>
        + Add Step
      </button>
    </PartFrame>
  )
}

import { GHOST_BTN } from '../../../shared/ui/styles'
import { PlusIcon } from '../components/icons'
import { GroupLabel } from './fields'
import { useEditorUi } from './editorUi'
import { StepEdit } from './StepEdit'
import type { GuideDraftController, StepLoc } from '../useGuideDraft'
import type { GuideStep } from '../types'

/** The numbered steps of one chapter section or standalone section, plus the add button. */
export function StepsEdit({
  loc,
  steps,
  d,
}: {
  loc: StepLoc
  steps: GuideStep[]
  d: GuideDraftController
}) {
  const ui = useEditorUi()
  return (
    <div>
      <GroupLabel>Steps{steps.length > 0 ? ` (${steps.length})` : ''}</GroupLabel>
      {steps.length > 0 && (
        <div className="mt-2 space-y-2.5">
          {steps.map((step, i) => (
            <StepEdit key={step.id} loc={loc} step={step} index={i} count={steps.length} d={d} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => ui.flashAdded(d.addStep(loc))}
        className={`${GHOST_BTN} mt-2.5`}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add step
      </button>
    </div>
  )
}

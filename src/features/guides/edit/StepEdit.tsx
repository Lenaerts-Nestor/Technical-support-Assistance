import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { GHOST_BTN, ICON_BTN, INPUT } from './fieldStyles'
import { SubItemEdit } from './SubItemEdit'
import type { GuideDraftController, StepLoc } from '../useGuideDraft'
import type { GuideStep } from '../types'

type StepEditProps = {
  loc: StepLoc
  step: GuideStep
  index: number
  count: number
  d: GuideDraftController
}

/** One editable step: text, image filename, ordered bullet / note sub-items. */
export function StepEdit({ loc, step, index, count, d }: StepEditProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
            {index + 1}
          </span>
          <button
            type="button"
            onClick={() => d.moveStep(loc, step.id, -1)}
            disabled={index === 0}
            aria-label="Move step up"
            className={ICON_BTN}
          >
            <ArrowUpIcon className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => d.moveStep(loc, step.id, 1)}
            disabled={index === count - 1}
            aria-label="Move step down"
            className={ICON_BTN}
          >
            <ArrowDownIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              value={step.text}
              onChange={(e) => d.updateStep(loc, step.id, { text: e.target.value })}
              placeholder={`Step ${index + 1}…`}
              className={INPUT}
            />
            <input
              value={step.image ?? ''}
              onChange={(e) => d.updateStep(loc, step.id, { image: e.target.value })}
              placeholder="Image file name…"
              className={`${INPUT} max-w-[200px]`}
            />
            <button
              type="button"
              onClick={() => d.removeStep(loc, step.id)}
              aria-label="Delete step"
              className="shrink-0 text-slate-400 hover:text-rose-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

          {step.subItems.length > 0 && (
            <div className="space-y-1.5">
              {step.subItems.map((sub, si) => (
                <SubItemEdit
                  key={sub.id}
                  item={sub}
                  canUp={si > 0}
                  canDown={si < step.subItems.length - 1}
                  onChange={(fields) => d.updateSubItem(loc, step.id, sub.id, fields)}
                  onMove={(dir) => d.moveSubItem(loc, step.id, sub.id, dir)}
                  onRemove={() => d.removeSubItem(loc, step.id, sub.id)}
                />
              ))}
            </div>
          )}

          <div className="flex gap-1.5 pl-6">
            <button
              type="button"
              onClick={() => d.addSubItem(loc, step.id, 'bullet')}
              className={GHOST_BTN}
            >
              • bullet
            </button>
            <button
              type="button"
              onClick={() => d.addSubItem(loc, step.id, 'info')}
              className={GHOST_BTN}
            >
              ◎ note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

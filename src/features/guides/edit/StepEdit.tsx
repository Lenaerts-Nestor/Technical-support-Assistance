import { useId } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, TrashIcon, XIcon } from '../components/icons'
import { useGuideImagePicker } from '../view/GuideAssetsContext'
import { DELETE_BTN, GHOST_BTN, ICON_BTN, INPUT } from '../../../shared/ui/styles'
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

/** One editable step: text, image, ordered bullet / note sub-items. */
export function StepEdit({ loc, step, index, count, d }: StepEditProps) {
  const { imageNames, pickImage } = useGuideImagePicker()
  const listId = useId()
  const image = step.image ?? ''

  const browse = async () => {
    const name = await pickImage()
    if (name) d.updateStep(loc, step.id, { image: name })
  }

  return (
    <div className="border-line bg-subtle rounded-lg border p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="bg-brand-soft text-brand-strong ring-brand-line flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ring-1">
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
            <button
              type="button"
              onClick={() => d.removeStep(loc, step.id)}
              aria-label="Delete step"
              className={`${DELETE_BTN} p-1`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Image: browse the linked folder, or type / autocomplete a filename. */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void browse()}
              aria-label="Choose an image from the linked folder"
              title="Choose an image from the linked folder"
              className={GHOST_BTN}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {image ? 'Change image' : 'Choose image'}
            </button>
            <input
              value={image}
              onChange={(e) => d.updateStep(loc, step.id, { image: e.target.value })}
              placeholder="No image — or type a filename…"
              list={imageNames.length > 0 ? listId : undefined}
              className={`${INPUT} max-w-[280px]`}
            />
            {imageNames.length > 0 && (
              <datalist id={listId}>
                {imageNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
            {image && (
              <button
                type="button"
                onClick={() => d.updateStep(loc, step.id, { image: '' })}
                aria-label="Remove image"
                className={`${DELETE_BTN} p-1`}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
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

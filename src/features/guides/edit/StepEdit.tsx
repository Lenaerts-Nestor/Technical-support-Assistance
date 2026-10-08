import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, TrashIcon, XIcon } from '../components/icons'
import { useGuideImagePicker } from '../view/GuideAssetsContext'
import { DELETE_BTN, GHOST_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { AutoTextarea, GroupLabel, INPUT } from './fields'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { SubItemEdit } from './SubItemEdit'
import { dropLineClass, listKey, useSortable } from './sortable'
import type { GuideDraftController, StepLoc } from '../useGuideDraft'
import type { GuideStep } from '../types'

type StepEditProps = {
  loc: StepLoc
  step: GuideStep
  index: number
  count: number
  d: GuideDraftController
}

/** One editable step: text, screenshot, and its ordered bullets / notes. */
export function StepEdit({ loc, step, index, count, d }: StepEditProps) {
  const { imageNames, pickImage } = useGuideImagePicker()
  const ui = useEditorUi()
  const listId = useId()
  const image = step.image ?? ''
  const fresh = ui.justAdded === step.id
  const sort = useSortable(
    listKey('steps', loc.partId, loc.sectionId),
    step.id,
    (from, target, pos) => d.moveStepTo(loc, from, target, pos),
    step.text || `Step ${index + 1}`,
  )
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [fresh])

  const browse = async () => {
    const name = await pickImage()
    if (name) d.updateStep(loc, step.id, { image: name })
  }

  // Enter at the end of a step starts the next one; anywhere else it is a line break.
  const onTextKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    const el = e.currentTarget
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length
    if (!atEnd || !step.text.trim()) return
    e.preventDefault()
    ui.flashAdded(d.addStep(loc, index + 1))
  }

  return (
    <div
      ref={ref}
      {...sort.itemProps}
      className={`border-line bg-subtle relative rounded-lg border p-3 ${sort.dragging ? 'opacity-40' : ''} ${
        fresh ? 'ring-brand/60 ring-2' : ''
      }`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <div className="flex items-start gap-2.5">
        <div className="flex w-6 shrink-0 flex-col items-center gap-1.5 pt-1.5">
          <GripHandle handleProps={sort.handleProps} label="Drag step" />
          <span className="bg-brand-soft text-brand-strong ring-brand-line flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1">
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

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <AutoTextarea
              value={step.text}
              onChange={(e) => d.updateStep(loc, step.id, { text: e.target.value })}
              onKeyDown={onTextKey}
              autoFocus={fresh}
              aria-label={`Step ${index + 1} text`}
              placeholder={`What should the reader do in step ${index + 1}?  (Enter = next step, Shift+Enter = new line)`}
            />
            <button
              type="button"
              onClick={() => d.removeStep(loc, step.id)}
              aria-label="Delete step"
              title="Delete step"
              className={`${DELETE_BTN} mt-1.5 p-1`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Image: browse the linked folder, or type / autocomplete a filename. */}
          <div>
            <GroupLabel className="mb-1.5">Screenshot</GroupLabel>
            <div className="flex flex-wrap items-center gap-2">
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
                aria-label="Image filename"
                list={imageNames.length > 0 ? listId : undefined}
                className={`${INPUT} min-w-48 max-w-[320px] flex-1`}
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
          </div>

          {step.subItems.length > 0 && (
            <div className="space-y-2">
              {step.subItems.map((sub, si) => (
                <SubItemEdit
                  key={sub.id}
                  loc={loc}
                  stepId={step.id}
                  item={sub}
                  index={si}
                  count={step.subItems.length}
                  d={d}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <GroupLabel>Under this step</GroupLabel>
            <button
              type="button"
              onClick={() => ui.flashAdded(d.addSubItem(loc, step.id, 'bullet'))}
              className={GHOST_BTN}
            >
              + Bullet point
            </button>
            <button
              type="button"
              onClick={() => ui.flashAdded(d.addSubItem(loc, step.id, 'info'))}
              className={GHOST_BTN}
            >
              + Info / warning note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

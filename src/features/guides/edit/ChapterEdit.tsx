import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { GHOST_BTN, ICON_BTN, INPUT, TEXTAREA } from './fieldStyles'
import { PartFrame } from './PartFrame'
import { StepEdit } from './StepEdit'
import type { GuideDraftController } from '../useGuideDraft'
import type { ChapterPart } from '../types'

type ChapterEditProps = {
  part: ChapterPart
  index: number
  count: number
  d: GuideDraftController
}

export function ChapterEdit({ part, index, count, d }: ChapterEditProps) {
  return (
    <PartFrame
      chip="H2 · Chapter"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <input
        value={part.subtitle}
        onChange={(e) => d.setChapterSubtitle(part.id, e.target.value)}
        placeholder="Chapter subtitle (H2)…"
        className={`${INPUT} font-semibold`}
      />

      <div className="mt-3 space-y-3">
        {part.sections.map((section, si) => (
          <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-2 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                H3
              </span>
              <input
                value={section.heading}
                onChange={(e) =>
                  d.updateSection(part.id, section.id, { heading: e.target.value })
                }
                placeholder="Section heading…"
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => d.moveSection(part.id, section.id, -1)}
                disabled={si === 0}
                aria-label="Move section up"
                className={ICON_BTN}
              >
                <ArrowUpIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => d.moveSection(part.id, section.id, 1)}
                disabled={si === part.sections.length - 1}
                aria-label="Move section down"
                className={ICON_BTN}
              >
                <ArrowDownIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => d.removeSection(part.id, section.id)}
                aria-label="Delete section"
                className="mt-1 shrink-0 text-slate-400 hover:text-rose-600"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={section.body}
              onChange={(e) =>
                d.updateSection(part.id, section.id, { body: e.target.value })
              }
              placeholder="Description / body text (optional)…"
              rows={2}
              className={`${TEXTAREA} mt-2`}
            />

            <div className="mt-2 space-y-2">
              {section.steps.map((step, stepIdx) => (
                <StepEdit
                  key={step.id}
                  loc={{ partId: part.id, sectionId: section.id }}
                  step={step}
                  index={stepIdx}
                  count={section.steps.length}
                  d={d}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => d.addStep({ partId: part.id, sectionId: section.id })}
              className={`${GHOST_BTN} mt-2`}
            >
              + Add Step
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => d.addSection(part.id)}
        className={`${GHOST_BTN} mt-3`}
      >
        + Add Section (H3)
      </button>
    </PartFrame>
  )
}

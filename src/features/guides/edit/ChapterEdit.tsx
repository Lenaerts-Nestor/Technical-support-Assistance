import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../components/icons'
import { PART_TONES } from '../guidesData'
import {
  DELETE_BTN,
  GHOST_BTN,
  ICON_BTN,
  INPUT_HEADING,
  INPUT_TITLE,
  SECTION_LABEL,
  TEXTAREA,
} from '../../../shared/ui/styles'
import { BlockFrame } from './BlockFrame'
import { SectionBlocksEdit } from './SectionBlocksEdit'
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
    <BlockFrame
      kind="chapter"
      chip="H2 · Chapter"
      index={index}
      count={count}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <label className={`mb-1.5 block ${SECTION_LABEL}`}>Chapter title</label>
      <input
        value={part.subtitle}
        onChange={(e) => d.setChapterSubtitle(part.id, e.target.value)}
        placeholder="Chapter subtitle (H2)…"
        className={INPUT_TITLE}
      />

      <div className="mt-5 space-y-3">
        {part.sections.map((section, si) => (
          <div
            key={section.id}
            className={`border-line bg-canvas rounded-lg border border-l-[3px] p-3 ${PART_TONES.section.rule}`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-1.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${PART_TONES.section.chip}`}
              >
                H3
              </span>
              <input
                value={section.heading}
                onChange={(e) =>
                  d.updateSection(part.id, section.id, { heading: e.target.value })
                }
                placeholder="Section heading…"
                className={INPUT_HEADING}
              />
              <button
                type="button"
                onClick={() => d.moveSection(part.id, section.id, -1)}
                disabled={si === 0}
                aria-label="Move section up"
                className={`mt-0.5 ${ICON_BTN}`}
              >
                <ArrowUpIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => d.moveSection(part.id, section.id, 1)}
                disabled={si === part.sections.length - 1}
                aria-label="Move section down"
                className={`mt-0.5 ${ICON_BTN}`}
              >
                <ArrowDownIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => d.removeSection(part.id, section.id)}
                aria-label="Delete section"
                className={`mt-0.5 p-1 ${DELETE_BTN}`}
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
              className={`${TEXTAREA} mt-2.5`}
            />

            <div className="mt-2.5 space-y-2">
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
              className={`${GHOST_BTN} mt-2.5`}
            >
              + Add Step
            </button>

            <SectionBlocksEdit
              loc={{ partId: part.id, sectionId: section.id }}
              blocks={section.blocks ?? []}
              d={d}
            />
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

      <div className="border-line-soft mt-4 border-t pt-3">
        <span className={SECTION_LABEL}>Chapter-level blocks</span>
        <SectionBlocksEdit
          loc={{ partId: part.id }}
          blocks={part.blocks ?? []}
          d={d}
        />
      </div>
    </BlockFrame>
  )
}

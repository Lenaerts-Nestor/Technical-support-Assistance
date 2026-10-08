import { Fragment, useEffect, useRef } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from '../components/icons'
import { PART_TONES } from '../guidesData'
import { DELETE_BTN, GHOST_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { BlockFrame, type Reorder } from './BlockFrame'
import { AutoTextarea, Field, GroupLabel, INPUT, INPUT_TITLE } from './fields'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { InsertBar } from './InsertBar'
import { SectionBlocksEdit } from './SectionBlocksEdit'
import { StepsEdit } from './StepsEdit'
import { dropLineClass, useSortable } from './sortable'
import type { GuideDraftController } from '../useGuideDraft'
import type { ChapterPart, GuideSection } from '../types'

const SECTION_KIND = [{ kind: 'section' as const, label: 'Section (H3)' }]

type ChapterEditProps = {
  part: ChapterPart
  index: number
  count: number
  reorder?: Reorder
  d: GuideDraftController
}

/** One H3 section inside a chapter: a card with its own fold, drag handle and arrows. */
function SectionRow({
  chapter,
  section,
  index,
  count,
  d,
}: {
  chapter: ChapterPart
  section: GuideSection
  index: number
  count: number
  d: GuideDraftController
}) {
  const ui = useEditorUi()
  const tone = PART_TONES.section
  const collapsed = ui.collapsed.has(section.id)
  const fresh = ui.justAdded === section.id
  const loc = { partId: chapter.id, sectionId: section.id }
  const sort = useSortable(
    `sections:${chapter.id}`,
    section.id,
    (from, target, pos) => d.moveSectionTo(chapter.id, from, target, pos),
    section.heading || `Section ${index + 1}`,
  )
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [fresh])

  return (
    <div
      ref={ref}
      {...sort.itemProps}
      className={`border-line bg-canvas relative rounded-lg border border-l-[3px] ${tone.rule} ${
        sort.dragging ? 'opacity-40' : ''
      } ${fresh ? 'ring-brand/70 ring-2' : ''}`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <div
        className={`border-line-soft bg-subtle flex items-center gap-2 rounded-tr-lg px-3 py-2 ${
          collapsed ? 'rounded-br-lg' : 'border-b'
        }`}
      >
        <GripHandle handleProps={sort.handleProps} label="Drag section" />
        <button
          type="button"
          onClick={() => ui.toggleCollapsed(section.id)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          className="text-ink-faint hover:text-ink rounded p-0.5"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${tone.chip}`}
        >
          H3 · Section {index + 1}
        </span>
        {collapsed ? (
          <button
            type="button"
            onClick={() => ui.toggleCollapsed(section.id)}
            className="text-ink min-w-0 flex-1 truncate text-left text-sm font-medium"
          >
            {section.heading || <span className="text-ink-faint font-normal">Untitled section</span>}
          </button>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={() => d.moveSection(chapter.id, section.id, -1)}
          disabled={index === 0}
          aria-label="Move section up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => d.moveSection(chapter.id, section.id, 1)}
          disabled={index === count - 1}
          aria-label="Move section down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => d.removeSection(chapter.id, section.id)}
          aria-label="Delete section"
          title="Delete section"
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div hidden={collapsed} className="space-y-4 p-3.5">
        <Field label="Section heading" hint="H3">
          <input
            value={section.heading}
            onChange={(e) => d.updateSection(chapter.id, section.id, { heading: e.target.value })}
            autoFocus={fresh}
            placeholder="e.g. Check the stream address"
            className={INPUT}
          />
        </Field>
        <Field label="Description" hint="optional intro text under the heading">
          <AutoTextarea
            value={section.body}
            onChange={(e) => d.updateSection(chapter.id, section.id, { body: e.target.value })}
            placeholder="A sentence or two of context before the steps…"
            rows={2}
          />
        </Field>
        <StepsEdit loc={loc} steps={section.steps} d={d} />
        <SectionBlocksEdit loc={loc} blocks={section.blocks ?? []} d={d} />
      </div>
    </div>
  )
}

export function ChapterEdit({ part, index, count, reorder, d }: ChapterEditProps) {
  const ui = useEditorUi()
  const fresh = ui.justAdded === part.id
  const sectionsLabel = `${part.sections.length} section${part.sections.length === 1 ? '' : 's'}`
  const addSection = (at?: number) => ui.flashAdded(d.addSection(part.id, at))

  return (
    <BlockFrame
      id={part.id}
      kind="chapter"
      chip="H2 · Chapter"
      summary={`${part.subtitle || 'Untitled chapter'} · ${sectionsLabel}`}
      index={index}
      count={count}
      reorder={reorder}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <Field label="Chapter title" hint="H2 — the heading of the whole card">
        <input
          value={part.subtitle}
          onChange={(e) => d.setChapterSubtitle(part.id, e.target.value)}
          autoFocus={fresh}
          placeholder="e.g. No picture on the display"
          className={INPUT_TITLE}
        />
      </Field>

      <div className="mt-5">
        <GroupLabel>Sections ({part.sections.length})</GroupLabel>
        <div className="mt-1">
          <InsertBar compact kinds={SECTION_KIND} hint="Insert a section here" onInsert={() => addSection(0)} />
          {part.sections.map((section, si) => (
            <Fragment key={section.id}>
              <SectionRow
                chapter={part}
                section={section}
                index={si}
                count={part.sections.length}
                d={d}
              />
              <InsertBar
                compact
                kinds={SECTION_KIND}
                hint="Insert a section here"
                onInsert={() => addSection(si + 1)}
              />
            </Fragment>
          ))}
        </div>
        <button type="button" onClick={() => addSection()} className={`${GHOST_BTN} mt-1`}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add section (H3)
        </button>
      </div>

      <div className="border-line-soft mt-5 border-t pt-4">
        <SectionBlocksEdit
          loc={{ partId: part.id }}
          blocks={part.blocks ?? []}
          d={d}
          label="Chapter-level blocks (shown under all sections)"
        />
      </div>
    </BlockFrame>
  )
}

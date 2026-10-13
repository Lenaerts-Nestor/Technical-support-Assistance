import { AutoTextarea, Field, INPUT_HEADING } from './fields'
import { BlockFrame, type Reorder } from './BlockFrame'
import { useEditorUi } from './editorUi'
import { ProjectZipField } from './ProjectZipField'
import { SectionBlocksEdit } from './SectionBlocksEdit'
import { StepsEdit } from './StepsEdit'
import type { GuideDraftController } from '../useGuideDraft'
import type { SectionPart } from '../types'

type SectionEditProps = {
  part: SectionPart
  index: number
  count: number
  reorder?: Reorder
  d: GuideDraftController
}

export function SectionEdit({ part, index, count, reorder, d }: SectionEditProps) {
  const ui = useEditorUi()
  const loc = { partId: part.id }

  return (
    <BlockFrame
      id={part.id}
      kind="section"
      chip="H3 · Section"
      summary={part.heading || 'Untitled section'}
      index={index}
      count={count}
      reorder={reorder}
      onMove={(dir) => d.movePart(part.id, dir)}
      onRemove={() => d.removePart(part.id)}
    >
      <div className="space-y-4">
        <Field label="Section heading" hint="H3">
          <input
            value={part.heading}
            onChange={(e) => d.updateSectionPart(part.id, { heading: e.target.value })}
            autoFocus={ui.justAdded === part.id}
            placeholder="e.g. Check the stream address"
            className={INPUT_HEADING}
          />
        </Field>
        <Field label="Description" hint="optional intro text under the heading">
          <AutoTextarea
            value={part.body}
            onChange={(e) => d.updateSectionPart(part.id, { body: e.target.value })}
            placeholder="A sentence or two of context before the steps…"
            rows={2}
          />
        </Field>
        <ProjectZipField
          value={part.projectZip}
          onChange={(projectZip) => d.updateSectionPart(part.id, { projectZip })}
        />
        <StepsEdit loc={loc} steps={part.steps} d={d} />
        <SectionBlocksEdit loc={loc} blocks={part.blocks ?? []} d={d} />
      </div>
    </BlockFrame>
  )
}

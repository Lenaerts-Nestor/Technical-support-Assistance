import { Fragment } from 'react'
import { CalloutIcon, PanelIcon, TableIcon, TermIcon } from '../components/icons'
import { BLOCK_KINDS, PART_TONES } from '../guidesData'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { CalloutEdit } from './CalloutEdit'
import { TableEdit } from './TableEdit'
import { TermEdit } from './TermEdit'
import { PanelEdit } from './PanelEdit'
import { GroupLabel } from './fields'
import { useEditorUi } from './editorUi'
import { InsertBar } from './InsertBar'
import { listKey } from './sortable'
import type { BlockRef, GuideDraftController, NodeLoc } from '../useGuideDraft'
import type { SectionBlock, SectionBlockKind } from '../types'

type SectionBlocksEditProps = {
  /** Which chapter / section owns these blocks. */
  loc: NodeLoc
  blocks: SectionBlock[]
  d: GuideDraftController
  /** Heading over the list; chapters and sections word it differently. */
  label?: string
}

const KIND_ICON: Record<SectionBlockKind, (p: { className?: string }) => React.ReactElement> = {
  table: TableIcon,
  callout: CalloutIcon,
  term: TermIcon,
  panel: PanelIcon,
}

/**
 * The tables / callouts / terms / panels belonging to one chapter or section,
 * plus the buttons that add them. Same editors as the top level, rendered in
 * their nested weight. Hover the line between two blocks to insert one there.
 */
export function SectionBlocksEdit({
  loc,
  blocks,
  d,
  label = 'Tables, callouts, terms & panels',
}: SectionBlocksEditProps) {
  const ui = useEditorUi()
  const reorder = {
    list: listKey('blocks', loc.partId, loc.sectionId),
    onDrop: (from: string, target: string, pos: 'before' | 'after') =>
      d.moveBlockTo(loc, from, target, pos),
  }
  const add = (kind: SectionBlockKind, index?: number) => ui.flashAdded(d.addBlock(loc, kind, index))

  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      {blocks.length > 0 && (
        <div className="mt-1">
          <InsertBar compact kinds={BLOCK_KINDS} onInsert={(k) => add(k, 0)} />
          {blocks.map((block, i) => {
            const addr: BlockRef = { scope: 'nested', loc, blockId: block.id }
            const frame = {
              addr,
              index: i,
              count: blocks.length,
              nested: true,
              reorder,
              d,
              onMove: (dir: -1 | 1) => d.moveBlock(loc, block.id, dir),
              onRemove: () => d.removeBlock(loc, block.id),
            }
            return (
              <Fragment key={block.id}>
                {block.type === 'table' ? (
                  <TableEdit part={block} {...frame} />
                ) : block.type === 'callout' ? (
                  <CalloutEdit part={block} {...frame} />
                ) : block.type === 'panel' ? (
                  <PanelEdit part={block} {...frame} />
                ) : (
                  <TermEdit part={block} {...frame} />
                )}
                <InsertBar compact kinds={BLOCK_KINDS} onInsert={(k) => add(k, i + 1)} />
              </Fragment>
            )
          })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {BLOCK_KINDS.map(({ kind, label: kindLabel }) => {
          const Icon = KIND_ICON[kind]
          return (
            <button key={kind} type="button" onClick={() => add(kind)} className={GHOST_BTN}>
              <span className={`h-1.5 w-1.5 rounded-full ${PART_TONES[kind].dot}`} aria-hidden />
              <Icon className="h-3.5 w-3.5" />
              Add {kindLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

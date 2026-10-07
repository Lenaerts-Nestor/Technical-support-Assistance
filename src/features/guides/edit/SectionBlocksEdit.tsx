import { CalloutIcon, PanelIcon, TableIcon, TermIcon } from '../components/icons'
import { BLOCK_KINDS, PART_TONES } from '../guidesData'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { CalloutEdit } from './CalloutEdit'
import { TableEdit } from './TableEdit'
import { TermEdit } from './TermEdit'
import { PanelEdit } from './PanelEdit'
import type { BlockRef, GuideDraftController, NodeLoc } from '../useGuideDraft'
import type { SectionBlock, SectionBlockKind } from '../types'

type SectionBlocksEditProps = {
  /** Which chapter / section owns these blocks. */
  loc: NodeLoc
  blocks: SectionBlock[]
  d: GuideDraftController
  /** Wording for the add buttons — chapters and sections read differently. */
  addLabel?: string
}

const KIND_ICON: Record<
  SectionBlockKind,
  (p: { className?: string }) => React.ReactElement
> = {
  table: TableIcon,
  callout: CalloutIcon,
  term: TermIcon,
  panel: PanelIcon,
}

/**
 * The tables / callouts / terms belonging to one chapter or section, plus the
 * buttons that add them. Same three editors as the top level, rendered in their
 * nested weight.
 */
export function SectionBlocksEdit({
  loc,
  blocks,
  d,
  addLabel = 'Add',
}: SectionBlocksEditProps) {
  return (
    <>
      {blocks.length > 0 && (
        <div className="mt-2.5 space-y-2">
          {blocks.map((block, i) => {
            const addr: BlockRef = { scope: 'nested', loc, blockId: block.id }
            const frame = {
              addr,
              index: i,
              count: blocks.length,
              nested: true,
              d,
              onMove: (dir: -1 | 1) => d.moveBlock(loc, block.id, dir),
              onRemove: () => d.removeBlock(loc, block.id),
            }
            if (block.type === 'table')
              return <TableEdit key={block.id} part={block} {...frame} />
            if (block.type === 'callout')
              return <CalloutEdit key={block.id} part={block} {...frame} />
            if (block.type === 'panel')
              return <PanelEdit key={block.id} part={block} {...frame} />
            return <TermEdit key={block.id} part={block} {...frame} />
          })}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {BLOCK_KINDS.map(({ kind, label }) => {
          const Icon = KIND_ICON[kind]
          return (
            <button
              key={kind}
              type="button"
              onClick={() => d.addBlock(loc, kind)}
              className={GHOST_BTN}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${PART_TONES[kind].dot}`}
                aria-hidden
              />
              <Icon className="h-3.5 w-3.5" />
              {addLabel} {label}
            </button>
          )
        })}
      </div>
    </>
  )
}

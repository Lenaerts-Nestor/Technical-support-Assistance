import { ChapterEdit } from './ChapterEdit'
import { SectionEdit } from './SectionEdit'
import { TableEdit } from './TableEdit'
import { CalloutEdit } from './CalloutEdit'
import { TermEdit } from './TermEdit'
import { PanelEdit } from './PanelEdit'
import type { BlockRef, GuideDraftController } from '../useGuideDraft'
import type { GuidePart } from '../types'

type GuidePartEditProps = {
  part: GuidePart
  index: number
  count: number
  d: GuideDraftController
}

/** Renders the editor for one top-level guide part by its `type`. */
export function GuidePartEdit({ part, index, count, d }: GuidePartEditProps) {
  switch (part.type) {
    case 'chapter':
      return <ChapterEdit part={part} index={index} count={count} d={d} />
    case 'section':
      return <SectionEdit part={part} index={index} count={count} d={d} />
    default: {
      const addr: BlockRef = { scope: 'part', partId: part.id }
      const frame = {
        addr,
        index,
        count,
        d,
        onMove: (dir: -1 | 1) => d.movePart(part.id, dir),
        onRemove: () => d.removePart(part.id),
      }
      if (part.type === 'table') return <TableEdit part={part} {...frame} />
      if (part.type === 'callout') return <CalloutEdit part={part} {...frame} />
      if (part.type === 'panel') return <PanelEdit part={part} {...frame} />
      return <TermEdit part={part} {...frame} />
    }
  }
}

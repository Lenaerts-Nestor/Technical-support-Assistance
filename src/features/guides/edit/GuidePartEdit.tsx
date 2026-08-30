import { ChapterEdit } from './ChapterEdit'
import { SectionEdit } from './SectionEdit'
import { TableEdit } from './TableEdit'
import { CalloutEdit } from './CalloutEdit'
import { TermEdit } from './TermEdit'
import type { GuideDraftController } from '../useGuideDraft'
import type { GuidePart } from '../types'

type GuidePartEditProps = {
  part: GuidePart
  index: number
  count: number
  d: GuideDraftController
}

/** Renders the editor for one guide part by its `type`. */
export function GuidePartEdit({ part, index, count, d }: GuidePartEditProps) {
  switch (part.type) {
    case 'chapter':
      return <ChapterEdit part={part} index={index} count={count} d={d} />
    case 'section':
      return <SectionEdit part={part} index={index} count={count} d={d} />
    case 'table':
      return <TableEdit part={part} index={index} count={count} d={d} />
    case 'callout':
      return <CalloutEdit part={part} index={index} count={count} d={d} />
    case 'term':
      return <TermEdit part={part} index={index} count={count} d={d} />
  }
}

import { ChapterView } from './ChapterView'
import { TableView } from './TableView'
import { CalloutView } from './CalloutView'
import { TermView } from './TermView'
import { SectionBlockView } from './SectionBlockView'
import type { GuidePart } from '../types'

type GuidePartViewProps = {
  part: GuidePart
  /** Chapter-only presentation state — ignored by every other part type. */
  accentIndex?: number
  collapsed?: boolean
  onToggle?: () => void
}

/** Renders one guide part by its `type`. */
export function GuidePartView({
  part,
  accentIndex = 0,
  collapsed = false,
  onToggle,
}: GuidePartViewProps) {
  switch (part.type) {
    case 'chapter':
      return (
        <ChapterView
          part={part}
          accentIndex={accentIndex}
          collapsed={collapsed}
          onToggle={onToggle ?? (() => {})}
        />
      )
    case 'section':
      return (
        <section
          id={part.id}
          className="scroll-mt-24 rounded-xl border border-slate-200 bg-white px-4 py-4"
        >
          <SectionBlockView
            heading={part.heading || 'Section'}
            body={part.body}
            steps={part.steps}
          />
        </section>
      )
    case 'table':
      return <TableView part={part} />
    case 'callout':
      return <CalloutView part={part} />
    case 'term':
      return <TermView part={part} />
  }
}

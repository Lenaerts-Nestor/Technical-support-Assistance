import { accentFor } from '../guidesData'
import { ChevronDownIcon } from '../components/icons'
import { CARD } from '../../../shared/ui/styles'
import { CalloutView } from './CalloutView'
import { SectionBlockView } from './SectionBlockView'
import { TableView } from './TableView'
import { TermView } from './TermView'
import type { ChapterPart, SectionBlock } from '../types'

/** A table / callout / term attached to the chapter rather than one section. */
function ChapterBlock({ block }: { block: SectionBlock }) {
  if (block.type === 'table') return <TableView part={block} nested />
  if (block.type === 'callout') return <CalloutView part={block} />
  return <TermView part={block} />
}

type ChapterViewProps = {
  part: ChapterPart
  accentIndex: number
  collapsed: boolean
  onToggle: () => void
}

/** One chapter (H2) as a distinct card with a tinted, collapsible heading band. */
export function ChapterView({ part, accentIndex, collapsed, onToggle }: ChapterViewProps) {
  const accent = accentFor(accentIndex)

  return (
    <section id={part.id} className={`${CARD} scroll-mt-20 overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2.5 border-b px-4 py-3 text-left ${accent.band}`}
      >
        <span className={`h-4 w-1 shrink-0 rounded-full ${accent.dot}`} />
        <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase">
          H2
        </span>
        <span className="flex-1 text-base font-semibold tracking-tight">
          {part.subtitle || 'Chapter'}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="divide-line-soft divide-y px-4">
          {part.sections.map((section) => (
            <div key={section.id} className="py-4 first:pt-4 last:pb-5">
              <SectionBlockView
                anchorId={section.id}
                heading={section.heading}
                body={section.body}
                steps={section.steps}
                blocks={section.blocks}
              />
            </div>
          ))}
          {part.blocks && part.blocks.length > 0 && (
            <div className="space-y-2.5 py-4">
              {part.blocks.map((block) => (
                <ChapterBlock key={block.id} block={block} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

import { accentFor } from '../guidesData'
import { ChevronDownIcon } from '../components/icons'
import { CARD } from '../../../shared/ui/styles'
import { CalloutView } from './CalloutView'
import { SectionBlockView } from './SectionBlockView'
import { TableView } from './TableView'
import { TermView } from './TermView'
import { PanelView } from './PanelView'
import type { ChapterPart, SectionBlock } from '../types'

/** A table / callout / term attached to the chapter rather than one section. */
function ChapterBlock({ block }: { block: SectionBlock }) {
  if (block.type === 'table') return <TableView part={block} nested />
  if (block.type === 'callout') return <CalloutView part={block} />
  if (block.type === 'panel') return <PanelView part={block} />
  return <TermView part={block} />
}

type ChapterViewProps = {
  part: ChapterPart
  accentIndex: number
  collapsed: boolean
  onToggle: () => void
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One chapter as a distinct card with a tinted, collapsible heading band. */
export function ChapterView({ part, accentIndex, collapsed, onToggle }: ChapterViewProps) {
  const accent = accentFor(accentIndex)
  const steps = part.sections.reduce((n, s) => n + s.steps.length, 0)
  const meta = [
    part.sections.length > 1 && plural(part.sections.length, 'section'),
    steps > 0 && plural(steps, 'step'),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section id={part.id} className={`${CARD} scroll-mt-20 overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-3 border-b px-4 py-3.5 text-left ${accent.band}`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/25 text-sm font-bold`}
        >
          {accentIndex + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-snug font-semibold tracking-tight">
            {part.subtitle || 'Chapter'}
          </span>
          {meta && <span className="block text-xs opacity-70">{meta}</span>}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="divide-line-soft divide-y px-5">
          {part.sections.map((section) => (
            <div key={section.id} className="py-5">
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
            <div className="space-y-3 py-5">
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

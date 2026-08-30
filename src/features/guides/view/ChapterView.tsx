import { accentFor } from '../guidesData'
import { ChevronDownIcon } from '../components/icons'
import { SectionBlockView } from './SectionBlockView'
import type { ChapterPart } from '../types'

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
    <section
      id={part.id}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left ${accent.band}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
        <span className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          H2
        </span>
        <span className="flex-1 text-sm font-semibold">{part.subtitle || 'Chapter'}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="space-y-5 px-4 py-4">
          {part.sections.map((section) => (
            <SectionBlockView
              key={section.id}
              anchorId={section.id}
              heading={section.heading}
              body={section.body}
              steps={section.steps}
            />
          ))}
        </div>
      )}
    </section>
  )
}

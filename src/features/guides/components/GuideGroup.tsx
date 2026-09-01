import { GuideCard } from './GuideCard'
import { COUNT_BADGE, SECTION_LABEL } from '../../../shared/ui/styles'
import type { Guide } from '../types'

type GuideGroupProps = {
  title: string
  sideLabel: string
  guides: Guide[]
  onOpen: (id: string) => void
  onTogglePin: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}

/** A labelled block of guide cards (Pinned / All guides). */
export function GuideGroup({
  title,
  sideLabel,
  guides,
  onOpen,
  onTogglePin,
  onMove,
}: GuideGroupProps) {
  return (
    <section>
      <div className="border-line mb-3 flex items-baseline justify-between border-b pb-2">
        <h3 className={`flex items-center gap-2 ${SECTION_LABEL}`}>
          {title}
          <span className={`${COUNT_BADGE} tracking-normal normal-case`}>
            {guides.length}
          </span>
        </h3>
        <span className="text-ink-faint text-[11px] font-medium tracking-[0.06em] uppercase">
          {sideLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {guides.map((guide, i) => (
          <GuideCard
            key={guide.id}
            guide={guide}
            canMoveUp={i > 0}
            canMoveDown={i < guides.length - 1}
            onOpen={() => onOpen(guide.id)}
            onTogglePin={() => onTogglePin(guide.id)}
            onMoveUp={() => onMove(guide.id, -1)}
            onMoveDown={() => onMove(guide.id, 1)}
          />
        ))}
      </div>
    </section>
  )
}

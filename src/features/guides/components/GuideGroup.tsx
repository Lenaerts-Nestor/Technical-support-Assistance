import { GuideCard } from './GuideCard'
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
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h3>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
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

import { SHIFT_LABELS } from '../config'
import type { Agent, ShiftNo } from '../types'
import { COUNT_BADGE, EMPTY, GHOST_BTN, INSET } from '../../../shared/ui/styles'
import type { DragEvent } from 'react'
import { AgentCard } from './AgentCard'
import type { CardRole } from './AgentCard'

type ShiftColumnProps = {
  shift: ShiftNo
  agents: Agent[]
  /** Role of each card, by agent id. */
  roleOf: (agent: Agent) => CardRole
  /** The picked agent when it sits in the other shift, so this column can take it. */
  incoming: { agent: Agent; lostLanguages: string[] } | null
  highlight: ReadonlySet<string>
  /** A drag is in progress; nothing may change size (see AgentCard). */
  dragging: boolean
  onPick: (agent: Agent) => void
  onCancel: () => void
  onMove: (agent: Agent) => void
  onSwap: (picked: Agent, partner: Agent) => void
  onDragStart: (agent: Agent, e: DragEvent) => void
  onDragEnd: () => void
  /** Whether the card being dragged (if any) comes from the other shift, so this one can take it. */
  acceptsDrop: () => boolean
  /** Dropped on a card: swap the two. */
  onDropOnCard: (target: Agent) => void
  /** Dropped on the column itself: move the dragged agent here. */
  onDropOnColumn: () => void
}

/** One shift: a list of agents that is also a drop target for moving someone in. */
export function ShiftColumn({
  shift,
  agents,
  roleOf,
  incoming,
  highlight,
  dragging,
  onPick,
  onCancel,
  onMove,
  onSwap,
  onDragStart,
  onDragEnd,
  acceptsDrop,
  onDropOnCard,
  onDropOnColumn,
}: ShiftColumnProps) {
  const headingId = `lunch-shift-${shift}`
  return (
    <section
      aria-labelledby={headingId}
      className={`${INSET} p-3 ${incoming ? 'outline-brand-line outline-dashed outline-2 -outline-offset-2' : ''}`}
      onDragOver={(e) => acceptsDrop() && e.preventDefault()}
      onDrop={(e) => {
        if (!acceptsDrop()) return
        e.preventDefault()
        onDropOnColumn()
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 id={headingId} className="text-ink text-sm font-bold tracking-tight">
          {SHIFT_LABELS[shift]}
        </h4>
        <span className={COUNT_BADGE}>{agents.length}</span>
      </div>

      {incoming && !dragging && (
        <button
          type="button"
          onClick={() => onMove(incoming.agent)}
          className={`${GHOST_BTN} mb-3 w-full ${incoming.lostLanguages.length ? '!border-rose-400/60' : ''}`}
        >
          Move {incoming.agent.name} here
          {incoming.lostLanguages.length > 0 && ` (leaves ${incoming.lostLanguages.join(', ')} uncovered)`}
        </button>
      )}

      {agents.length === 0 ? (
        <p className={`${EMPTY} !py-6`}>Nobody in this shift.</p>
      ) : (
        <ul className="space-y-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              role={roleOf(agent)}
              highlight={highlight}
              dragging={dragging}
              onPick={() => onPick(agent)}
              onCancel={onCancel}
              onMove={() => onMove(agent)}
              onSwap={() => {
                const role = roleOf(agent)
                if (role.kind === 'partner') onSwap(role.picked, agent)
              }}
              onDragStart={(e) => onDragStart(agent, e)}
              onDragEnd={onDragEnd}
              acceptsDrop={acceptsDrop}
              onDrop={() => onDropOnCard(agent)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

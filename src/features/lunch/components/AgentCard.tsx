import type { DragEvent } from 'react'
import { LANGUAGES, SHIFT_LABELS } from '../config'
import type { Agent, LanguageWarning, ShiftNo } from '../types'
import { SwapIcon } from './icons'
import { CHIP, GHOST_BTN, PANEL } from '../../../shared/ui/styles'

/** How this card relates to the agent currently picked for a swap. */
export type CardRole =
  /** Nothing is picked. */
  | { kind: 'idle' }
  /** This is the picked agent. */
  | { kind: 'picked'; moveTo: ShiftNo; moveLost: LanguageWarning[] }
  /** A possible swap partner (other shift). `shared` are the languages they have in common. */
  | { kind: 'partner'; picked: Agent; lost: LanguageWarning[]; shared: string[] }
  /** Picked agent is in this card's own shift. */
  | { kind: 'other' }

type AgentCardProps = {
  agent: Agent
  role: CardRole
  onPick: () => void
  onCancel: () => void
  onMove: () => void
  onSwap: () => void
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  /** Whether a dragged card may be dropped on this one right now. Asked at drop time, not from render state. */
  acceptsDrop: () => boolean
  onDrop: () => void
  /** Languages of the picked agent, drawn stronger on every card. */
  highlight: ReadonlySet<string>
  /**
   * A drag is in progress. Cards keep their size (only the colour ring changes),
   * so the card under the pointer does not move away before the drop.
   */
  dragging: boolean
}

const codes = new Map(LANGUAGES.map((l) => [l.name, l.code]))

const BADGE = 'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase'

/** One agent in a shift: who they are, and the buttons / drag handle to move them. */
export function AgentCard({ agent, role, onPick, onCancel, onMove, onSwap, onDragStart, onDragEnd, acceptsDrop, onDrop, highlight, dragging }: AgentCardProps) {
  const partner = role.kind === 'partner' ? role : null
  const showControls = !dragging
  const safe = partner !== null && partner.lost.length === 0
  const ring =
    role.kind === 'picked'
      ? 'ring-2 ring-brand'
      : partner
        ? safe
          ? 'ring-2 ring-emerald-400/70'
          : 'ring-2 ring-rose-400/70'
        : ''

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => acceptsDrop() && e.preventDefault()}
      onDrop={(e) => {
        if (!acceptsDrop()) return
        e.preventDefault()
        e.stopPropagation()
        onDrop()
      }}
      className={`${PANEL} cursor-grab space-y-2 p-3 ${ring} ${role.kind === 'other' ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start gap-2 max-md:flex-wrap">
        <div className="min-w-0 flex-1 max-md:basis-40">
          <p className="text-ink truncate text-sm font-semibold">{agent.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {agent.languages.map((language) => (
              <span
                key={language}
                title={language}
                className={`${CHIP} ${highlight.has(language) ? '!border-brand-line !bg-brand-soft !text-brand-strong' : ''}`}
              >
                {codes.get(language) ?? language}
                <span className="sr-only"> ({language})</span>
              </span>
            ))}
            {agent.chat && <span className={`${BADGE} border-info/50 bg-info-surface text-sky-100`}>Chat</span>}
            {agent.earlyShift && <span className={`${BADGE} border-violet-400/50 bg-violet-400/15 text-violet-100`}>Early</span>}
            {agent.yesterdayShift && (
              <span className={`${BADGE} border-line-strong text-ink-muted`} title={`Yesterday: ${SHIFT_LABELS[agent.yesterdayShift]}`}>
                Yest. {agent.yesterdayShift}
              </span>
            )}
          </div>
        </div>
        {role.kind === 'picked' && showControls ? (
          <button type="button" className={`${GHOST_BTN} max-md:min-h-11 max-md:w-full`} aria-pressed="true" onClick={onCancel}>
            Cancel
          </button>
        ) : partner && showControls ? (
          <button
            type="button"
            onClick={onSwap}
            className={`${GHOST_BTN} max-md:min-h-11 max-md:w-full ${safe ? '!border-emerald-400/60' : '!border-rose-400/60'}`}
            aria-label={`Swap ${partner.picked.name} with ${agent.name}`}
          >
            <SwapIcon className="h-3.5 w-3.5" />
            Swap with {partner.picked.name}
          </button>
        ) : (
          <button type="button" className={`${GHOST_BTN} max-md:min-h-11`} aria-pressed="false" aria-label={`Swap ${agent.name}`} onClick={onPick}>
            <SwapIcon className="h-3.5 w-3.5" />
            Swap
          </button>
        )}
      </div>

      {role.kind === 'picked' && showControls && (
        <button
          type="button"
          onClick={onMove}
          className={`${GHOST_BTN} w-full max-md:min-h-11 ${role.moveLost.length ? '!border-rose-400/60' : ''}`}
        >
          Move {agent.name} to {SHIFT_LABELS[role.moveTo]}
        </button>
      )}
      {role.kind === 'picked' && showControls && role.moveLost.length > 0 && (
        <p className="text-xs font-semibold text-rose-300">Leaves a language uncovered: {role.moveLost.map((w) => w.language).join(', ')}</p>
      )}
      {partner && showControls && (
        <p className={`text-xs font-semibold ${safe ? 'text-emerald-300' : 'text-rose-300'}`}>
          {safe
            ? partner.shared.length
              ? `Safe swap · both speak ${partner.shared.join(', ')}`
              : 'Safe swap · no coverage lost'
            : `Leaves uncovered: ${partner.lost.map((w) => `${w.language} (${SHIFT_LABELS[w.shift ?? 1]})`).join(', ')}`}
        </p>
      )}
    </li>
  )
}

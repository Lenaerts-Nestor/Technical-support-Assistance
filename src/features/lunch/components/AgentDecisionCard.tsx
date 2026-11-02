import { LANGUAGES } from '../config'
import type { Agent } from '../types'
import { CHIP, PANEL, SECTION_LABEL } from '../../../shared/ui/styles'
import { ShiftCell } from './RosterCells'

const codes = new Map(LANGUAGES.map((l) => [l.name, l.code]))

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

type DecisionSwitchProps = {
  /** What the user reads on the button. */
  label: string
  /** What a screen reader reads: it includes the agent's name and starts with the visible label. */
  name: string
  on: boolean
  /** Colours of the "Yes" state; the "No" state is `offTone`. */
  onTone: string
  offTone?: string
  onChange: (on: boolean) => void
}

const NEUTRAL = 'border-line-strong bg-field/60 text-ink-muted'

/** One yes/no decision as a finger-sized switch: the question on the left, the answer on the right. */
function DecisionSwitch({ label, name, on, onTone, offTone = NEUTRAL, onChange }: DecisionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={name}
      onClick={() => onChange(!on)}
      className={`${FOCUS} flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${on ? onTone : offTone}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-xs font-extrabold tracking-wide uppercase">
        {on ? 'Yes' : 'No'}
      </span>
    </button>
  )
}

type AgentDecisionCardProps = {
  agent: Agent
  onChange: (patch: Partial<Omit<Agent, 'id'>>) => void
}

/**
 * One agent on a phone, for the three things a team lead decides each morning: who is in today, who
 * starts early, and where they were yesterday. The name comes first, then Early and Available side by
 * side, then yesterday's shift. Languages and chat are shown but not edited here (the table does that,
 * on a computer), and so is adding, renaming and deleting.
 */
export function AgentDecisionCard({ agent, onChange }: AgentDecisionCardProps) {
  return (
    <li className={`${PANEL} p-3 ${agent.available ? '' : 'opacity-85'}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-ink min-w-0 truncate text-base font-semibold">{agent.name}</p>
        {agent.languages.map((language) => (
          <span key={language} title={language} className={CHIP}>
            {codes.get(language) ?? language}
            <span className="sr-only"> ({language})</span>
          </span>
        ))}
        {agent.chat && <span className={`${CHIP} !border-info/50 !bg-info-surface !text-sky-100`}>Chat</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <DecisionSwitch
          label="Early"
          name={`Early shift: ${agent.name}`}
          on={agent.earlyShift}
          onTone="border-violet-400/60 bg-violet-400/15 text-violet-100"
          onChange={(earlyShift) => onChange({ earlyShift })}
        />
        <DecisionSwitch
          label="Available"
          name={`Available today: ${agent.name}`}
          on={agent.available}
          onTone="border-success/60 bg-success-surface text-emerald-100"
          offTone="border-danger/45 bg-danger-surface text-rose-100"
          onChange={(available) => onChange({ available })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={SECTION_LABEL}>Yesterday</span>
        <ShiftCell
          large
          label={`Yesterday's shift: ${agent.name}`}
          value={agent.yesterdayShift}
          onChange={(yesterdayShift) => onChange({ yesterdayShift })}
        />
      </div>
    </li>
  )
}

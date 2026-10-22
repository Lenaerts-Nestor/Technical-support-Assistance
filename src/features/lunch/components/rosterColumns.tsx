import type { ReactNode } from 'react'
import { LanguageCell, NameCell, ShiftCell, YesNoCell } from './RosterCells'
import type { Agent } from '../types'

/**
 * The roster table's columns. To add a field (team, skills, notes …): add it to
 * `Agent` (types.ts) and `reviveAgents` (roster.ts), then add one entry here — a
 * heading, how it sorts, and the cell that edits it. The table itself, sorting and
 * saving need no change.
 */

export type CellContext = {
  agent: Agent
  /** The whole roster (the language toggles list every language in use). */
  agents: Agent[]
  onChange: (patch: Partial<Omit<Agent, 'id'>>) => void
  isTaken: (name: string, exceptId: string) => boolean
}

export type Column = {
  id: string
  label: string
  /** What the column sorts on; `null` sorts last. */
  sortValue: (agent: Agent) => string | number | null
  cell: (ctx: CellContext) => ReactNode
}

export const COLUMNS: Column[] = [
  {
    id: 'name',
    label: 'Agent name',
    sortValue: (a) => a.name,
    cell: ({ agent, isTaken, onChange }) => (
      <NameCell agent={agent} isTaken={isTaken} onRename={(name) => onChange({ name })} />
    ),
  },
  {
    id: 'languages',
    label: 'Languages',
    // Most languages first, then alphabetical, so the polyglots group together.
    sortValue: (a) => `${String(9 - a.languages.length)}${[...a.languages].sort().join(',')}`,
    cell: ({ agent, agents, onChange }) => (
      <LanguageCell agent={agent} agents={agents} onChange={(languages) => onChange({ languages })} />
    ),
  },
  {
    id: 'chat',
    label: 'Chat agent',
    sortValue: (a) => Number(a.chat),
    cell: ({ agent, onChange }) => (
      <YesNoCell label={`Chat agent: ${agent.name}`} on={agent.chat} onChange={(chat) => onChange({ chat })} />
    ),
  },
  {
    id: 'earlyShift',
    label: 'Early shift',
    sortValue: (a) => Number(a.earlyShift),
    cell: ({ agent, onChange }) => (
      <YesNoCell
        label={`Early shift: ${agent.name}`}
        on={agent.earlyShift}
        onChange={(earlyShift) => onChange({ earlyShift })}
      />
    ),
  },
  {
    id: 'available',
    label: 'Available today',
    sortValue: (a) => Number(a.available),
    cell: ({ agent, onChange }) => (
      <YesNoCell
        label={`Available today: ${agent.name}`}
        on={agent.available}
        onChange={(available) => onChange({ available })}
      />
    ),
  },
  {
    id: 'yesterdayShift',
    label: "Yesterday's shift",
    sortValue: (a) => a.yesterdayShift,
    cell: ({ agent, onChange }) => (
      <ShiftCell
        label={`Yesterday's shift: ${agent.name}`}
        value={agent.yesterdayShift}
        onChange={(yesterdayShift) => onChange({ yesterdayShift })}
      />
    ),
  },
]

import type { RosterStatus } from '../rosterApi'

type Shown = Exclude<RosterStatus, 'off'>

const PILL: Record<Shown, { dot: string; label: string; title: string }> = {
  syncing: { dot: 'bg-info animate-pulse', label: 'Syncing…', title: 'Looking up the shared roster' },
  synced: {
    dot: 'bg-success',
    label: 'Shared',
    title: 'These agents are shared: everyone who plans lunch sees the same agents, and a change made here reaches them.',
  },
  offline: { dot: 'bg-warning', label: 'Offline', title: 'The shared roster cannot be reached right now' },
  setup: { dot: 'bg-warning', label: 'Not set up', title: 'The shared roster is not set up yet' },
  denied: { dot: 'bg-danger', label: 'Not allowed', title: 'This name may not change the shared roster' },
}

/** What the problem states say in full, under the card header. The healthy states need no more than the pill. */
const PROBLEM: Partial<Record<Shown, { tone: string; text: string }>> = {
  offline: {
    tone: 'text-amber-200',
    text: 'The shared roster cannot be reached. Your changes are kept here and sent when it is back.',
  },
  setup: {
    tone: 'text-amber-200',
    text: 'The shared roster is not set up yet, so these agents are only kept in this browser. Run supabase/lunch_roster.sql once in Supabase.',
  },
  denied: { tone: 'text-rose-300', text: 'This name may not change the shared roster. Choose Kevin C or Nestor under “I am”.' },
}

/** A small "Shared" marker for the Agents card title. Nothing while the roster is not shared at all. */
export function RosterStatusPill({ status }: { status: RosterStatus }) {
  if (status === 'off') return null
  const { dot, label, title } = PILL[status]
  return (
    <span role="status" title={title} className="text-ink-muted inline-flex items-center gap-1.5 text-xs font-semibold">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

/** The full sentence for a roster that is not syncing properly; nothing when all is well. */
export function RosterProblem({ status }: { status: RosterStatus }) {
  const problem = status === 'off' ? undefined : PROBLEM[status]
  if (!problem) return null
  return <p className={`border-line border-b px-4 py-2 text-xs font-semibold ${problem.tone}`}>{problem.text}</p>
}

import { LANGUAGES, SHIFT_LABELS } from './config'
import type { Assignment } from './scheduler'
import type { Agent, LanguageWarning, ShiftNo } from './types'

/**
 * Language checks on a finished schedule. Used for the warnings under the generate
 * button, for the NOTES block of the Teams text, and to judge a manual swap — all
 * from one function, so they can never disagree.
 */

/** Every language to check: the configured ones plus any an agent carries (e.g. from an import). */
export function knownLanguages(agents: Agent[]): string[] {
  const names = LANGUAGES.map((l) => l.name)
  for (const agent of agents) for (const l of agent.languages) if (!names.includes(l)) names.push(l)
  return names
}

export function analyzeSchedule(agents: Agent[], { shift1, shift2 }: Assignment): LanguageWarning[] {
  const byId = new Map(agents.map((a) => [a.id, a]))
  const members = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? [])
  const shifts: [ShiftNo, Agent[]][] = [
    [1, members(shift1)],
    [2, members(shift2)],
  ]
  const warnings: LanguageWarning[] = []

  for (const language of knownLanguages(agents)) {
    const speakers = shifts.map(([, list]) => list.filter((a) => a.languages.includes(language)))
    const total = speakers[0].length + speakers[1].length
    if (total === 0) {
      warnings.push({ kind: 'none', language, message: `No ${language} speaker available today` })
    } else if (total === 1) {
      const only = (speakers[0][0] ?? speakers[1][0]).name
      warnings.push({ kind: 'single', language, message: `Only one ${language} speaker today (${only}), no backup` })
    } else {
      shifts.forEach(([no], i) => {
        if (speakers[i].length === 0) {
          warnings.push({ kind: 'uncovered', language, shift: no, message: `No ${language} speaker in ${SHIFT_LABELS[no]}` })
        }
      })
    }
  }
  return warnings
}

/** Moves `a` to the other shift, or swaps `a` with `b` (who sits in the other shift). */
export function applyMove(schedule: Assignment, a: string, b?: string): Assignment {
  const inFirst = schedule.shift1.includes(a)
  const from = inFirst ? schedule.shift1 : schedule.shift2
  const to = inFirst ? schedule.shift2 : schedule.shift1
  const nextFrom = from.filter((id) => id !== a && id !== b)
  const nextTo = to.filter((id) => id !== b)
  if (b) nextFrom.push(b)
  nextTo.push(a)
  return inFirst ? { shift1: nextFrom, shift2: nextTo } : { shift1: nextTo, shift2: nextFrom }
}

const sameWarning = (x: LanguageWarning, y: LanguageWarning) =>
  x.kind === y.kind && x.language === y.language && x.shift === y.shift

/** Coverage gaps a move or swap would create that the schedule does not have now. Empty means it is safe. */
export function coverageLost(agents: Agent[], schedule: Assignment, a: string, b?: string): LanguageWarning[] {
  const before = analyzeSchedule(agents, schedule).filter((w) => w.kind === 'uncovered')
  const after = analyzeSchedule(agents, applyMove(schedule, a, b)).filter((w) => w.kind === 'uncovered')
  return after.filter((w) => !before.some((old) => sameWarning(old, w)))
}

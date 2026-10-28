import type { SharedDay } from '../shift/shiftLogic'
import { lastWorkingEntry, mergeHistory } from './history'
import { applyYesterday, nameKey } from './roster'
import type { Agent, HistoryEntry, LunchData, Schedule } from './types'

/**
 * The published days (what Kevin C or Nestor shared with Copy for Teams) as history entries, so whoever opens the
 * Lunch Planner next, on any computer, builds on the same schedule instead of only on what they generated themselves.
 */
export const sharedToEntries = (days: SharedDay[]): HistoryEntry[] =>
  days.map(({ day, shift1, shift2, chat, out, notes }) => ({ date: day, shift1, shift2, chat, out, notes }))

/** What identifies the day "yesterday's shift" is read from: a change here means the roster has to be brought up to date again. */
const keyOf = (e: HistoryEntry) => [e.date, e.shift1.join(','), e.shift2.join(','), e.out.join(',')].join('|')

/**
 * Brings published days into the data. A published day replaces the same day saved here (it is what the team was
 * told). The first time a different "last working day" shows up, yesterday's shifts and who was out are applied to the
 * roster once, exactly as the new-day step does; after that the person's own changes to availability are left alone.
 * Returns the same object when no earlier day is published.
 */
export function adoptShared(data: LunchData, entries: HistoryEntry[], today: string): LunchData {
  // Only earlier days: today's published schedule is offered on the schedule card, not filed as history.
  const past = entries.filter((e) => e.date < today)
  if (past.length === 0) return data
  const history = mergeHistory(data.history, past, today)
  const last = lastWorkingEntry(past, today)
  const key = last ? keyOf(last) : ''
  if (key === (data.sharedKey ?? '')) return { ...data, history }
  // A day not yet rolled over is handled by rollOver itself, which reads the merged history.
  const agents = data.syncedDate === today ? applyYesterday(data.agents, { history }, today) : data.agents
  return { ...data, history, agents, sharedKey: key }
}

export type SharedSchedule = {
  schedule: Schedule
  /** Names the roster does not have, so they could not be placed. */
  unknown: string[]
  /**
   * The roster agents the schedule places. Exactly these are available today: the published schedule is everyone who
   * was in, so anyone else on this roster is away, whether or not the publisher listed them as out.
   */
  present: Set<string>
}

/** A published day as a schedule of this roster's agent ids. */
export function scheduleFromShared(entry: HistoryEntry, agents: Agent[], today: string): SharedSchedule {
  const byName = new Map(agents.map((a) => [nameKey(a.name), a.id]))
  const unknown: string[] = []
  const place = (names: string[]) =>
    names.flatMap((name) => {
      const id = byName.get(nameKey(name))
      if (id) return id
      unknown.push(name)
      return []
    })
  const shift1 = place(entry.shift1)
  const shift2 = place(entry.shift2)
  return { schedule: { date: today, shift1, shift2 }, unknown, present: new Set([...shift1, ...shift2]) }
}

const sortedKeys = (names: string[]) => names.map(nameKey).sort().join('|')

/** Whether the schedule on screen (names per shift) is the published one. */
export const sameShifts = (a: Pick<HistoryEntry, 'shift1' | 'shift2'>, b: Pick<HistoryEntry, 'shift1' | 'shift2'>) =>
  sortedKeys(a.shift1) === sortedKeys(b.shift1) && sortedKeys(a.shift2) === sortedKeys(b.shift2)

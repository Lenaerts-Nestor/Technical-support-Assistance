import { boardNames, deriveBoard } from './board'
import { LANGUAGES, isAssumedLanguage } from './config'
import { lastWorkingEntry, reviveHistory, saveEntry, shiftOnEntry, wasOutOnEntry } from './history'
import type { Agent, LunchData, Schedule, ShiftNo } from './types'

export const newId = () => crypto.randomUUID()

/** The key names are compared by: case and stray spaces never make two agents "different". */
export const nameKey = (name: string) => name.trim().toLowerCase()

export function newAgent(fields: Partial<Omit<Agent, 'id'>> & { name: string }): Agent {
  return {
    id: newId(),
    languages: [],
    chat: false,
    earlyShift: false,
    available: true,
    yesterdayShift: null,
    ...fields,
    name: fields.name.trim(),
  }
}

export const emptyLunchData = (): LunchData => ({ agents: [], history: [], schedule: null, syncedDate: '' })

/* -- Reading stored / imported data ----------------------------------------- */
/* Every field is checked and defaulted, so data written by an older version of
   the page (or typed by hand into a JSON file) can never reach the UI malformed. */

const asBool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const asShift = (v: unknown): ShiftNo | null => (v === 1 || v === 2 ? v : null)
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export function reviveAgents(raw: unknown): Agent[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const agents: Agent[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name || seen.has(nameKey(name))) continue
    seen.add(nameKey(name))
    agents.push({
      id: typeof o.id === 'string' && o.id ? o.id : newId(),
      name,
      languages: [...new Set(asStrings(o.languages).filter((l) => !isAssumedLanguage(l)))],
      chat: asBool(o.chat, false),
      earlyShift: asBool(o.earlyShift, false),
      available: asBool(o.available, true),
      yesterdayShift: asShift(o.yesterdayShift),
    })
  }
  return agents
}

function reviveSchedule(raw: unknown): Schedule | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.date !== 'string') return null
  return { date: o.date, shift1: asStrings(o.shift1), shift2: asStrings(o.shift2) }
}

export function reviveLunchData(raw: unknown): LunchData | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  return {
    agents: reviveAgents(o.agents),
    history: reviveHistory(o.history),
    schedule: reviveSchedule(o.schedule),
    syncedDate: typeof o.syncedDate === 'string' ? o.syncedDate : '',
  }
}

/* -- A new day -------------------------------------------------------------- */

/**
 * Carries the last saved working day over to the roster: each agent's yesterday
 * shift (`null` for anyone the entry does not place), and availability — whoever
 * was out that day is marked not available, whoever worked is marked available.
 * An agent the entry does not mention (new) keeps what they had. Without any saved
 * day the roster is left as typed.
 */
export function applyYesterday(agents: Agent[], data: Pick<LunchData, 'history'>, today: string): Agent[] {
  const entry = lastWorkingEntry(data.history, today)
  if (!entry) return agents
  return agents.map((a) => {
    const yesterdayShift = shiftOnEntry(entry, a.name)
    const available = wasOutOnEntry(entry, a.name) ? false : yesterdayShift !== null ? true : a.available
    return { ...a, yesterdayShift, available }
  })
}

/**
 * Files away the schedule of an earlier day that was never saved, so "yesterday's
 * shift" has something to read even when nobody pressed Save. A day that already has
 * a saved entry is left alone.
 */
function archiveSchedule(data: LunchData, today: string): LunchData['history'] {
  const { schedule } = data
  if (!schedule || schedule.date >= today || data.history.some((e) => e.date === schedule.date)) return data.history
  const board = deriveBoard(data.agents, schedule)
  if (!board || board.shift1.length + board.shift2.length === 0) return data.history
  return saveEntry(data.history, { date: schedule.date, ...boardNames(board) }, today)
}

/**
 * Brings stored data up to date for `today`: the first time a new day is seen, the
 * previous schedule is filed in the history if it was not saved, yesterday's shifts
 * are filled in from it (and so is who was out) and a schedule from an earlier day is dropped. Anyone
 * not in that day's entry keeps their availability: someone away stays away until
 * marked available again. Idempotent
 * — returns the same object when nothing is due.
 */
export function rollOver(data: LunchData, today: string): LunchData {
  if (data.syncedDate === today) return data
  const history = archiveSchedule(data, today)
  return {
    ...data,
    history,
    agents: applyYesterday(data.agents, { history }, today),
    schedule: data.schedule?.date === today ? data.schedule : null,
    syncedDate: today,
  }
}

/* -- Table: search, filter, sort --------------------------------------------- */

export type AvailabilityFilter = 'all' | 'available' | 'away'

export function filterAgents(agents: Agent[], query: string, availability: AvailabilityFilter): Agent[] {
  const q = query.trim().toLowerCase()
  const codes = new Map(LANGUAGES.map((l) => [l.name, l.code.toLowerCase()]))
  return agents.filter((a) => {
    if (availability === 'available' && !a.available) return false
    if (availability === 'away' && a.available) return false
    if (!q) return true
    return (
      a.name.toLowerCase().includes(q) ||
      a.languages.some((l) => l.toLowerCase().includes(q) || codes.get(l) === q)
    )
  })
}

export type SortDirection = 'asc' | 'desc'

/** Stable sort by any column's value; empty values (`null`) always go last. */
export function sortAgents(
  agents: Agent[],
  value: (agent: Agent) => string | number | null,
  direction: SortDirection,
): Agent[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...agents].sort((a, b) => {
    const x = value(a)
    const y = value(b)
    if (x === y) return 0
    if (x === null) return 1
    if (y === null) return -1
    const order = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : x < y ? -1 : 1
    return sign * order
  })
}

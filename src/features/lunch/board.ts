import { analyzeSchedule } from './coverage'
import type { Assignment } from './scheduler'
import type { Agent, HistoryEntry, LanguageWarning, Schedule } from './types'

/**
 * What the schedule looks like right now: the stored shift lists checked against
 * the roster as it is today. An agent who was deleted or marked unavailable after
 * generating drops out of their shift; one added or made available since shows up
 * as `unassigned` instead of being silently left out.
 */
export type Board = {
  /** Clean id lists — what swaps and warnings work on. */
  assignment: Assignment
  shift1: Agent[]
  shift2: Agent[]
  /** Scheduled agents who handle chat. */
  chat: Agent[]
  /** Not available today. */
  out: Agent[]
  /** Available, but in neither shift yet. */
  unassigned: Agent[]
  warnings: LanguageWarning[]
}

const byName = (a: Agent, b: Agent) => a.name.localeCompare(b.name)

export function deriveBoard(agents: Agent[], schedule: Schedule | null): Board | null {
  if (!schedule) return null
  const byId = new Map(agents.map((a) => [a.id, a]))
  const placed = new Set<string>()
  const members = (ids: string[]) =>
    ids.flatMap((id) => {
      const agent = byId.get(id)
      if (!agent?.available || placed.has(id)) return []
      placed.add(id)
      return agent
    })
  const shift1 = members(schedule.shift1).sort(byName)
  const shift2 = members(schedule.shift2).sort(byName)
  const assignment = { shift1: shift1.map((a) => a.id), shift2: shift2.map((a) => a.id) }
  return {
    assignment,
    shift1,
    shift2,
    chat: [...shift1, ...shift2].filter((a) => a.chat).sort(byName),
    out: agents.filter((a) => !a.available).sort(byName),
    unassigned: agents.filter((a) => a.available && !placed.has(a.id)).sort(byName),
    warnings: analyzeSchedule(agents, assignment),
  }
}

const names = (list: Agent[]) => list.map((a) => a.name)

/** The board as names — the shape the Teams text and the history share. */
export function boardNames(board: Board): Omit<HistoryEntry, 'date'> {
  return {
    shift1: names(board.shift1),
    shift2: names(board.shift2),
    chat: names(board.chat),
    out: names(board.out),
    notes: board.warnings.map((w) => w.message),
  }
}

/** Whether a saved day is exactly this board. */
export function matchesEntry(board: Board, entry: HistoryEntry): boolean {
  const now = boardNames(board)
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
  return (
    same(now.shift1, entry.shift1) &&
    same(now.shift2, entry.shift2) &&
    same(now.chat, entry.chat) &&
    same(now.out, entry.out) &&
    same(now.notes, entry.notes)
  )
}

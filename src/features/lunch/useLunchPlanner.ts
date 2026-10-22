import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToday } from '../calendar/useToday'
import { boardNames, deriveBoard, matchesEntry } from './board'
import type { Board } from './board'
import { mergeHistory, saveEntry } from './history'
import { lunchStorage } from './lunchStorage'
import { applyYesterday, newAgent, nameKey, rollOver } from './roster'
import { generateSchedule } from './scheduler'
import type { Assignment } from './scheduler'
import type { Agent, HistoryEntry, LunchData } from './types'

/** How long edits settle before they are written to storage. */
const SAVE_DEBOUNCE_MS = 400

export type AddResult = 'added' | 'empty' | 'duplicate'

export type LunchPlanner = {
  today: string
  agents: Agent[]
  history: HistoryEntry[]
  /** The schedule as it stands now, or `null` before anything was generated today. */
  board: Board | null
  /** True when the last write to storage failed (full or blocked), so edits live in memory only. */
  saveFailed: boolean
  /** Today's schedule is saved exactly as it looks now (false again after any change). */
  savedToday: boolean
  addAgent: (name: string) => AddResult
  updateAgent: (id: string, patch: Partial<Omit<Agent, 'id'>>) => void
  removeAgent: (id: string) => void
  /** Fill "yesterday's shift" again from the last saved working day. */
  refillYesterday: () => void
  generate: () => void
  /** Replace the shifts, e.g. after a swap. */
  setAssignment: (next: Assignment) => void
  saveToday: () => void
  deleteHistory: (date: string) => void
  /** Replace the roster; history, when given, is merged by day. */
  importRoster: (agents: Agent[], history: HistoryEntry[] | null) => void
}

/**
 * The Lunch Planner's state and actions. Loads from `lunchStorage` on mount, writes
 * back (debounced) after every change, and runs the "new day" step (rollOver)
 * whenever the date moves on — also while the page stays open overnight.
 * Returns `null` until the first load has finished.
 */
export function useLunchPlanner(): LunchPlanner | null {
  const today = useToday()
  const [stored, setStored] = useState<LunchData | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void lunchStorage.load().then((loaded) => {
      if (!cancelled) setStored(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Derived rather than stored, so a new day shows up without an effect; the next edit makes it permanent.
  const data = useMemo(() => (stored ? rollOver(stored, today) : null), [stored, today])

  useEffect(() => {
    if (!data) return
    const timer = window.setTimeout(() => {
      lunchStorage.save(data).then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      )
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [data])

  const update = useCallback(
    (change: (d: LunchData) => LunchData) => setStored((prev) => (prev ? change(rollOver(prev, today)) : prev)),
    [today],
  )

  const board = useMemo(() => (data ? deriveBoard(data.agents, data.schedule) : null), [data])

  const agents = data?.agents
  const addAgent = useCallback(
    (name: string): AddResult => {
      const trimmed = name.trim()
      if (!trimmed) return 'empty'
      if (agents?.some((a) => nameKey(a.name) === nameKey(trimmed))) return 'duplicate'
      update((d) => ({ ...d, agents: [...d.agents, newAgent({ name: trimmed })] }))
      return 'added'
    },
    [agents, update],
  )

  const updateAgent = useCallback(
    (id: string, patch: Partial<Omit<Agent, 'id'>>) =>
      update((d) => ({ ...d, agents: d.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    [update],
  )

  const removeAgent = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        agents: d.agents.filter((a) => a.id !== id),
        schedule: d.schedule && {
          ...d.schedule,
          shift1: d.schedule.shift1.filter((x) => x !== id),
          shift2: d.schedule.shift2.filter((x) => x !== id),
        },
      })),
    [update],
  )

  const refillYesterday = useCallback(
    () => update((d) => ({ ...d, agents: applyYesterday(d.agents, d, today) })),
    [update, today],
  )

  const generate = useCallback(
    () => update((d) => ({ ...d, schedule: { date: today, ...generateSchedule(d.agents) } })),
    [update, today],
  )

  const setAssignment = useCallback(
    (next: Assignment) => update((d) => ({ ...d, schedule: { date: today, ...next } })),
    [update, today],
  )

  const saveToday = useCallback(() => {
    if (!board) return
    const entry: HistoryEntry = { date: today, ...boardNames(board) }
    update((d) => ({ ...d, history: saveEntry(d.history, entry, today) }))
  }, [board, update, today])

  const deleteHistory = useCallback(
    (date: string) => update((d) => ({ ...d, history: d.history.filter((e) => e.date !== date) })),
    [update],
  )

  const importRoster = useCallback(
    (incoming: Agent[], history: HistoryEntry[] | null) =>
      update((d) => ({
        ...d,
        agents: incoming,
        // The old shift lists point at agents that are gone; a fresh Generate is the honest next step.
        schedule: null,
        history: history ? mergeHistory(d.history, history, today) : d.history,
      })),
    [update, today],
  )

  if (!data) return null
  const savedEntry = data.history.find((e) => e.date === today)
  return {
    today,
    agents: data.agents,
    history: data.history,
    board,
    saveFailed,
    savedToday: Boolean(savedEntry && board && matchesEntry(board, savedEntry)),
    addAgent,
    updateAgent,
    removeAgent,
    refillYesterday,
    generate,
    setAssignment,
    saveToday,
    deleteHistory,
    importRoster,
  }
}

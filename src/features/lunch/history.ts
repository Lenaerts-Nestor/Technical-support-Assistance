import { addDays, parseIso, weekdayIndex } from '../calendar/calendarData'
import { HISTORY_DAYS } from './config'
import type { HistoryEntry, ShiftNo } from './types'

const nameKey = (name: string) => name.trim().toLowerCase()

/** Newest first, within `HISTORY_DAYS` of `today`. */
export function recentHistory(history: HistoryEntry[], today: string): HistoryEntry[] {
  const oldest = addDays(today, -HISTORY_DAYS)
  return history.filter((e) => e.date >= oldest).sort((a, b) => b.date.localeCompare(a.date))
}

/** Adds the entry, replacing a save for the same day, and drops what is older than the history window. */
export function saveEntry(history: HistoryEntry[], entry: HistoryEntry, today: string): HistoryEntry[] {
  return recentHistory([...history.filter((e) => e.date !== entry.date), entry], today)
}

/** Merges imported entries over the existing ones, per day. */
export function mergeHistory(history: HistoryEntry[], incoming: HistoryEntry[], today: string): HistoryEntry[] {
  const byDate = new Map(history.map((e) => [e.date, e]))
  for (const entry of incoming) byDate.set(entry.date, entry)
  return recentHistory([...byDate.values()], today)
}

/**
 * The day "yesterday's shift" comes from: the latest saved working day before
 * `today`. A Monday therefore reads Friday, since nothing is saved over the weekend
 * (a weekend save, if someone makes one, is skipped).
 */
export function lastWorkingEntry(history: HistoryEntry[], today: string): HistoryEntry | null {
  let best: HistoryEntry | null = null
  for (const entry of history) {
    if (entry.date >= today || weekdayIndex(entry.date) >= 5) continue
    if (!best || entry.date > best.date) best = entry
  }
  return best
}

export function shiftOnEntry(entry: HistoryEntry, name: string): ShiftNo | null {
  const key = nameKey(name)
  if (entry.shift1.some((n) => nameKey(n) === key)) return 1
  if (entry.shift2.some((n) => nameKey(n) === key)) return 2
  return null
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export function reviveHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const byDate = new Map<string, HistoryEntry>()
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    if (typeof o.date !== 'string' || !parseIso(o.date)) continue
    byDate.set(o.date, {
      date: o.date,
      shift1: asStrings(o.shift1),
      shift2: asStrings(o.shift2),
      chat: asStrings(o.chat),
      out: asStrings(o.out),
      notes: asStrings(o.notes),
    })
  }
  return [...byDate.values()]
}

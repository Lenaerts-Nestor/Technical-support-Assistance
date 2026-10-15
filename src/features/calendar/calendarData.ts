import type { CalendarEntry, LeaveKind, LeaveRun } from './types'

/**
 * Dates are plain `YYYY-MM-DD` strings in the user's local calendar. All the
 * arithmetic goes through UTC so a daylight-saving change can never shift a day.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Monday first, as in the calendar. */
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** The longest span the date dialog will fill in one go. */
export const MAX_RANGE_DAYS = 366

export const NOTE_MAX_LENGTH = 60

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** `month` is 0-based, as in `Date`. */
export const toIso = (year: number, month: number, day: number) =>
  `${pad(year, 4)}-${pad(month + 1)}-${pad(day)}`

/** The parts of a real date, or `null` for anything else (`2026-02-30`, `soon`). */
export function parseIso(iso: unknown): { year: number; month: number; day: number } | null {
  if (typeof iso !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(Date.UTC(year, month, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day
    ? { year, month, day }
    : null
}

const utc = (iso: string) => {
  const p = parseIso(iso)
  return p ? Date.UTC(p.year, p.month, p.day) : NaN
}

const fromUtc = (ms: number) => {
  const d = new Date(ms)
  return toIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Today in the local time zone. */
export const todayIso = (now: Date = new Date()) => toIso(now.getFullYear(), now.getMonth(), now.getDate())

export const addDays = (iso: string, days: number) => fromUtc(utc(iso) + days * 86_400_000)

/** 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (iso: string) => (new Date(utc(iso)).getUTCDay() + 6) % 7

export const isWeekend = (iso: string) => weekdayIndex(iso) >= 5

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

export type MonthRef = { year: number; month: number }

export const monthOf = (iso: string): MonthRef => {
  const p = parseIso(iso)
  return p ? { year: p.year, month: p.month } : monthOf(todayIso())
}

/** `delta` months away, wrapping the year. */
export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + month + delta
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 }
}

/** Whole Monday-to-Sunday weeks covering the month — 4 to 6 rows of 7 days. */
export function monthCells({ year, month }: MonthRef): { iso: string; inMonth: boolean }[] {
  const first = toIso(year, month, 1)
  const last = toIso(year, month, daysInMonth(year, month))
  const start = addDays(first, -weekdayIndex(first))
  const end = addDays(last, 6 - weekdayIndex(last))
  const cells: { iso: string; inMonth: boolean }[] = []
  for (let iso = start; iso <= end; iso = addDays(iso, 1)) {
    cells.push({ iso, inMonth: iso.startsWith(`${pad(year, 4)}-${pad(month + 1)}-`) })
  }
  return cells
}

/** "Wednesday, 15 November 2026". */
export function formatLong(iso: string): string {
  const p = parseIso(iso)
  if (!p) return iso
  return `${WEEKDAY_NAMES[weekdayIndex(iso)]}, ${p.day} ${MONTH_NAMES[p.month]} ${p.year}`
}

/** "15 Nov" or, across years, "15 Nov 2026". */
export function formatShort(iso: string, withYear = false): string {
  const p = parseIso(iso)
  if (!p) return iso
  return `${p.day} ${MONTH_NAMES[p.month].slice(0, 3)}${withYear ? ` ${p.year}` : ''}`
}

/**
 * Every date from `from` to `to`, inclusive, oldest first. `skipWeekends` only
 * applies to a span of more than one day, so picking a single Saturday still
 * marks it. Empty for a backwards or invalid span; capped at {@link MAX_RANGE_DAYS}.
 */
export function datesBetween(from: string, to: string, skipWeekends: boolean): string[] {
  if (!parseIso(from) || !parseIso(to) || to < from) return []
  const dates: string[] = []
  for (let iso = from; iso <= to && dates.length < MAX_RANGE_DAYS; iso = addDays(iso, 1)) {
    if (skipWeekends && from !== to && isWeekend(iso)) continue
    dates.push(iso)
  }
  return dates
}

/* -- Reading calendar.json ---------------------------------------------- */

/** Validate parsed JSON into entries — one per date (the last wins), oldest first. */
export function reviveEntries(raw: unknown): CalendarEntry[] | null {
  const list = Array.isArray(raw) ? raw : (raw as { entries?: unknown } | null)?.entries
  if (!Array.isArray(list)) return null
  const byDate = new Map<string, CalendarEntry>()
  for (const item of list) {
    const e = item as { date?: unknown; kind?: unknown; note?: unknown } | null
    if (!e || typeof e !== 'object' || !parseIso(e.date)) continue
    const kind: LeaveKind = e.kind === 'other' ? 'other' : 'pto'
    const note = kind === 'other' && typeof e.note === 'string' ? e.note.trim().slice(0, NOTE_MAX_LENGTH) : ''
    byDate.set(e.date as string, { date: e.date as string, kind, note })
  }
  return sortEntries([...byDate.values()])
}

export const sortEntries = (entries: CalendarEntry[]) =>
  [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

/* -- Reading the entries ------------------------------------------------- */

/**
 * Join consecutive marked days into events: same kind, same note, and nothing
 * but a weekend between them — so a Monday-to-Friday week off is one run, and
 * Friday plus the next Monday joins up too.
 */
export function groupRuns(entries: CalendarEntry[]): LeaveRun[] {
  const runs: LeaveRun[] = []
  for (const entry of sortEntries(entries)) {
    const last = runs[runs.length - 1]
    if (last && last.kind === entry.kind && last.note === entry.note) {
      let next = addDays(last.end, 1)
      while (next < entry.date && isWeekend(next)) next = addDays(next, 1)
      if (next === entry.date) {
        last.end = entry.date
        last.days++
        continue
      }
    }
    runs.push({ start: entry.date, end: entry.date, kind: entry.kind, note: entry.note, days: 1 })
  }
  return runs
}

/** The next `limit` events that have not finished by `today` (one in progress counts). */
export function upcomingRuns(entries: CalendarEntry[], today: string, limit = 5): LeaveRun[] {
  return groupRuns(entries)
    .filter((run) => run.end >= today)
    .slice(0, limit)
}

/** Marked days of each kind inside `year`. */
export function countDays(entries: CalendarEntry[], year: number): Record<LeaveKind, number> {
  const counts: Record<LeaveKind, number> = { pto: 0, other: 0 }
  const prefix = `${pad(year, 4)}-`
  for (const e of entries) if (e.date.startsWith(prefix)) counts[e.kind]++
  return counts
}

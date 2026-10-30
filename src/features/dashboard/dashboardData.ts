import { nameKey } from '../lunch/roster'
import type { ShiftNo } from '../lunch/types'
import type { SharedDay } from '../shift/shiftLogic'

/**
 * When each shift is at lunch, in minutes after midnight. Matches the Teams reminders
 * (REMINDER_NOTE in shift/config.ts): Shift 1 at 11:45, Shift 2 at 12:30, 45 minutes each.
 */
export const LUNCH_WINDOWS: Record<ShiftNo, { start: number; end: number }> = {
  1: { start: 11 * 60 + 45, end: 12 * 60 + 30 },
  2: { start: 12 * 60 + 30, end: 13 * 60 + 15 },
}

/** The shift at lunch at `now`, or `null` outside both windows. */
export function shiftOnLunch(now: Date): ShiftNo | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const shift of [1, 2] as const) {
    if (minutes >= LUNCH_WINDOWS[shift].start && minutes < LUNCH_WINDOWS[shift].end) return shift
  }
  return null
}

export const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const shiftOf = (day: SharedDay | undefined, name: string): ShiftNo | null => {
  if (!day) return null
  const key = nameKey(name)
  if (day.shift1.some((n) => nameKey(n) === key)) return 1
  if (day.shift2.some((n) => nameKey(n) === key)) return 2
  return null
}

/** Favorites grouped by their shift today; favorites not in either shift are left out. */
export function favoritesByShift(day: SharedDay | undefined, favorites: string[]): Record<ShiftNo, string[]> {
  const groups: Record<ShiftNo, string[]> = { 1: [], 2: [] }
  for (const name of favorites) {
    const shift = shiftOf(day, name)
    if (shift) groups[shift].push(name)
  }
  return groups
}

/** Favorites per person (keyed by `nameKey`), as stored. */
export type FavoritesMap = Record<string, string[]>

export function reviveFavorites(raw: unknown): FavoritesMap | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const out: FavoritesMap = {}
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string')
  }
  return out
}

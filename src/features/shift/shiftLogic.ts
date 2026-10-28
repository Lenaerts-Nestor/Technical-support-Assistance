import { nameKey } from '../lunch/roster'
import type { ShiftNo } from '../lunch/types'

/** One published day. Names only. */
export type SharedDay = {
  day: string
  shift1: string[]
  shift2: string[]
  /** Everyone on the publisher's roster, to fill the "I am" list. */
  team: string[]
  publishedBy: string
  updatedAt: string
}

/** What a publisher sends. `chat`, `out` and `notes` are only used for the Teams post; they are not stored. */
export type PublishInput = Pick<SharedDay, 'day' | 'shift1' | 'shift2' | 'team'> & {
  chat: string[]
  out: string[]
  notes: string[]
}

/** What the Teams side did: `posted` (this press posted), `already` (Teams was posted earlier today), `off` (no Teams link set up). */
export type TeamsPost = 'posted' | 'already' | 'off'

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

/** The server's rows (snake_case), checked field by field, newest day first. Anything malformed is skipped. */
export function reviveDays(raw: unknown): SharedDay[] {
  if (!Array.isArray(raw)) return []
  const days: SharedDay[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    if (typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) continue
    days.push({
      day: r.day,
      shift1: asStrings(r.shift1),
      shift2: asStrings(r.shift2),
      team: asStrings(r.team),
      publishedBy: typeof r.published_by === 'string' ? r.published_by : '',
      updatedAt: typeof r.updated_at === 'string' ? r.updated_at : '',
    })
  }
  return days.sort((a, b) => b.day.localeCompare(a.day))
}

/** Replaces the row for `next.day`, keeps the others, newest first. */
export const withDay = (days: SharedDay[], next: SharedDay): SharedDay[] =>
  [next, ...days.filter((d) => d.day !== next.day)].sort((a, b) => b.day.localeCompare(a.day))

/** The shift `me` has on `today`, or `null` when nothing is published for today or `me` is not in it. */
export function shiftFor(days: SharedDay[], today: string, me: string | null): ShiftNo | null {
  if (!me) return null
  const row = days.find((d) => d.day === today)
  if (!row) return null
  const key = nameKey(me)
  if (row.shift1.some((n) => nameKey(n) === key)) return 1
  if (row.shift2.some((n) => nameKey(n) === key)) return 2
  return null
}

export const isPublisher = (name: string | null, publishers: readonly string[]): boolean =>
  name !== null && publishers.some((p) => nameKey(p) === nameKey(name))

/** The "I am" choices: the newest published team, plus the local roster, plus the current pick; once each, A to Z. */
export function choices(days: SharedDay[], rosterNames: string[], me: string | null): string[] {
  const seen = new Map<string, string>()
  for (const name of [...(days[0]?.team ?? []), ...rosterNames, ...(me ? [me] : [])]) {
    const trimmed = name.trim()
    if (trimmed && !seen.has(nameKey(trimmed))) seen.set(nameKey(trimmed), trimmed)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

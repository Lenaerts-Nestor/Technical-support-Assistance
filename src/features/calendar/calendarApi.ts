import { failure, headers } from '../shift/shiftApi'
import type { Backend } from '../shift/shiftApi'
import { reviveEntries } from './calendarData'
import type { CalendarEntry } from './types'

/**
 * This person's saved calendar (see supabase/calendar.sql), or `null` when they never saved one —
 * which is not the same as a calendar with no days. Rejects when the service cannot be reached.
 */
export async function fetchCalendar(
  backend: Backend,
  person: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<CalendarEntry[] | null> {
  const res = await request(`${backend.url}/rest/v1/rpc/get_calendar`, {
    method: 'POST',
    headers: headers(backend),
    body: JSON.stringify({ p_person: person }),
    signal,
  })
  if (!res.ok) throw await failure(res)
  const answer: unknown = await res.json().catch(() => null)
  if (answer === null) return null
  const entries = reviveEntries(answer)
  if (!entries) throw new Error('The calendar service sent something unexpected.')
  return entries
}

/** Replaces this person's saved calendar with `entries`. Rejects with the server's reason. */
export async function saveCalendar(
  backend: Backend,
  person: string,
  entries: CalendarEntry[],
  request: typeof fetch = fetch,
): Promise<void> {
  const res = await request(`${backend.url}/rest/v1/rpc/save_calendar`, {
    method: 'POST',
    headers: headers(backend),
    body: JSON.stringify({ p_person: person.trim(), p_entries: entries }),
  })
  if (!res.ok) throw await failure(res)
}

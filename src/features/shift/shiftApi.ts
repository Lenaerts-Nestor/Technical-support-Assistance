import { reviveDays } from './shiftLogic'
import type { PublishInput, SharedDay, TeamsPost } from './shiftLogic'

export type Backend = { url: string; key: string }

/** Keeps what is sent within what the database accepts (names 40 characters, notes 160). */
const fit = (list: string[], max: number) => list.map((s) => s.trim().slice(0, max)).filter(Boolean)

const headers = (backend: Backend) => ({ apikey: backend.key, 'Content-Type': 'application/json' })

/** What the server said, in a few words: its own message when it sent one. */
async function failure(res: Response): Promise<Error> {
  try {
    const body: unknown = await res.json()
    const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : null
    if (typeof message === 'string' && message) return new Error(message)
  } catch {
    // Not JSON: the status below is all there is.
  }
  return new Error(`The shared shift service answered ${res.status}.`)
}

/** The recent days, newest first. The database only ever returns the last 14 days. */
export async function fetchDays(backend: Backend, signal?: AbortSignal, request: typeof fetch = fetch): Promise<SharedDay[]> {
  const query = 'select=day,shift1,shift2,team,published_by,updated_at&order=day.desc&limit=14'
  const res = await request(`${backend.url}/rest/v1/lunch_shift?${query}`, { headers: headers(backend), signal })
  if (!res.ok) throw await failure(res)
  return reviveDays(await res.json())
}

/**
 * Publishes today's shifts. Resolves to what happened with Teams (the first publish of a day posts it, later ones
 * do not). Rejects with the server's reason when the name may not publish.
 */
export async function publishDay(
  backend: Backend,
  publisher: string,
  input: PublishInput,
  request: typeof fetch = fetch,
): Promise<TeamsPost> {
  const res = await request(`${backend.url}/rest/v1/rpc/publish_lunch_shift`, {
    method: 'POST',
    headers: headers(backend),
    body: JSON.stringify({
      p_day: input.day,
      p_shift1: fit(input.shift1, 40),
      p_shift2: fit(input.shift2, 40),
      p_team: fit(input.team, 40),
      p_publisher: publisher,
      p_chat: fit(input.chat, 40),
      p_out: fit(input.out, 40),
      p_notes: fit(input.notes, 160),
    }),
  })
  if (!res.ok) throw await failure(res)
  const answer: unknown = await res.json().catch(() => null)
  return answer === 'posted' || answer === 'already' ? answer : 'off'
}

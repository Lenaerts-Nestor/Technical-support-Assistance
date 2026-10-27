import { reviveDays } from './shiftLogic'
import type { PublishInput, SharedDay } from './shiftLogic'

export type Backend = { url: string; key: string }

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

/** Publishes today's shifts. Rejects with the server's reason when the name may not publish. */
export async function publishDay(
  backend: Backend,
  publisher: string,
  input: PublishInput,
  request: typeof fetch = fetch,
): Promise<void> {
  const res = await request(`${backend.url}/rest/v1/rpc/publish_lunch_shift`, {
    method: 'POST',
    headers: headers(backend),
    body: JSON.stringify({
      p_day: input.day,
      p_shift1: input.shift1,
      p_shift2: input.shift2,
      p_team: input.team,
      p_publisher: publisher,
    }),
  })
  if (!res.ok) throw await failure(res)
}

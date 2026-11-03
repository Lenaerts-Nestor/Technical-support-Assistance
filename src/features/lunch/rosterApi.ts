import { failure, headers } from '../shift/shiftApi'
import type { Backend } from '../shift/shiftApi'
import { reviveRoster } from './sharedRoster'
import type { Push, SharedAgent } from './sharedRoster'

/**
 * How this computer stands with the shared roster, for the Agents card.
 *  - `off`      nothing is shared: the service is off, or nobody who plans lunch is picked under "I am".
 *  - `syncing`  reading or sending for the first time.
 *  - `synced`   the roster here is the shared one (and what was changed here has been sent).
 *  - `offline`  the service could not be reached; changes are kept here and sent later.
 *  - `setup`    the database has no roster yet: supabase/lunch_roster.sql has not been run.
 *  - `denied`   the database refused this name.
 */
export type RosterStatus = 'off' | 'syncing' | 'synced' | 'offline' | 'setup' | 'denied'

/** Whether changes made now reach the other people who plan lunch: yes while syncing, in sync, or offline (they are sent later). */
export const isShared = (status: RosterStatus): boolean => status === 'syncing' || status === 'synced' || status === 'offline'

/** A refusal or failure from the roster service, with the HTTP status it came with (0 for "never got an answer"). */
export class RosterError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'RosterError'
    this.status = status
  }
}

/** What a failed attempt means for the user. */
export function statusFor(error: unknown): RosterStatus {
  if (error instanceof RosterError) {
    if (error.status === 404) return 'setup'
    if (error.status === 403) return 'denied'
  }
  return 'offline'
}

/** Keeps what is sent within what the database accepts (name 40 characters, 8 languages of 30). */
const wire = (a: SharedAgent) => ({
  id: a.id,
  name: a.name.trim().slice(0, 40),
  languages: a.languages.map((l) => l.trim().slice(0, 30)).filter(Boolean).slice(0, 8),
  chat: a.chat,
  early_shift: a.earlyShift,
})

/**
 * One round trip with the shared roster (see supabase/lunch_roster.sql): sends what changed here and gets the whole
 * roster back. With nothing to send it is a plain read. Rejects with a `RosterError`; `by` must be one of the people
 * who plan lunch.
 */
export async function syncRoster(
  backend: Backend,
  by: string,
  push: Push,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<SharedAgent[]> {
  let res: Response
  try {
    res = await request(`${backend.url}/rest/v1/rpc/sync_lunch_roster`, {
      method: 'POST',
      headers: headers(backend),
      signal,
      body: JSON.stringify({ p_by: by, p_save: push.save.map(wire), p_remove: push.remove, p_replace: push.replace }),
    })
  } catch (e) {
    throw new RosterError(e instanceof Error ? e.message : 'The roster service could not be reached.', 0)
  }
  if (!res.ok) throw new RosterError((await failure(res)).message, res.status)
  const roster = reviveRoster(await res.json().catch(() => null))
  if (!roster) throw new RosterError('The roster service sent something unexpected.', res.status)
  return roster
}

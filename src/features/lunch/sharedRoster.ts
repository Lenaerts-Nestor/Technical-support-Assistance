import { isAssumedLanguage } from './config'
import { applyYesterday, nameKey } from './roster'
import type { Agent, LunchData, RosterQueue } from './types'

/**
 * The shared roster (supabase/lunch_roster.sql): the agents of the Lunch Planner, kept in the database so Kevin C and
 * Nestor, on a computer or a phone, plan with the same people. Only who an agent is is shared (name, languages, chat,
 * early shift). Whether they are in today and where they sat yesterday stay on each computer: those are worked out from the
 * published schedules, and shared through Copy for Teams / "Load it" (see `sharedHistory.ts`).
 *
 * Everything here is pure: what to send, and how the answer is merged into the local roster. The network is in
 * `rosterApi.ts` and the timing in `useRosterSync.ts`.
 *
 * The local roster stays the one the page reads and edits, so the page works offline and instantly. The queue kept
 * in `LunchData.roster` is what this computer changed and the database does not know yet; a change in the queue is
 * never overwritten by the shared roster, and is sent as soon as there is a connection.
 */

/** What the database keeps about an agent. */
export type RosterProfile = Pick<Agent, 'name' | 'languages' | 'chat' | 'earlyShift'>

export type SharedAgent = RosterProfile & { id: string }

const PROFILE_KEYS = ['name', 'languages', 'chat', 'earlyShift'] as const

/** Whether this edit changes something the database keeps (as opposed to "in today" or yesterday's shift). */
export const changesProfile = (patch: Partial<Omit<Agent, 'id'>>): boolean => PROFILE_KEYS.some((key) => key in patch)

export const profileOf = (a: Agent): RosterProfile => ({
  name: a.name,
  languages: [...a.languages],
  chat: a.chat,
  earlyShift: a.earlyShift,
})

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

/** Same name, languages (in any order), chat and early shift. */
export const sameProfile = (a: RosterProfile, b: RosterProfile): boolean =>
  a.name === b.name && a.chat === b.chat && a.earlyShift === b.earlyShift && sameSet(a.languages, b.languages)

/* -- The answer ------------------------------------------------------------- */

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/**
 * The database's answer (snake_case rows), checked field by field. `null` when it is not a list at all, so an odd
 * answer is never read as "the shared roster is empty" (which would make this computer send everything again).
 * An entry without an id or a name, or one that repeats an id or a name, is skipped.
 */
export function reviveRoster(raw: unknown): SharedAgent[] | null {
  if (!Array.isArray(raw)) return null
  const ids = new Set<string>()
  const names = new Set<string>()
  const agents: SharedAgent[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!id || !name || ids.has(id) || names.has(nameKey(name))) continue
    ids.add(id)
    names.add(nameKey(name))
    agents.push({
      id,
      name,
      languages: [...new Set(asStrings(o.languages).map((l) => l.trim()).filter((l) => l && !isAssumedLanguage(l)))],
      chat: o.chat === true,
      earlyShift: o.early_shift === true,
    })
  }
  return agents
}

/* -- The queue: what this computer changed ----------------------------------- */

export const emptyQueue = (): RosterQueue => ({ synced: false, dirty: [], removed: [] })

export const queueOf = (data: Pick<LunchData, 'roster'>): RosterQueue => data.roster ?? emptyQueue()

const unique = (ids: Iterable<string>): string[] => [...new Set(ids)]

/** These agents were added or changed here. */
export function markDirty(data: LunchData, ids: string[]): LunchData {
  const queue = queueOf(data)
  return { ...data, roster: { ...queue, dirty: unique([...queue.dirty, ...ids]) } }
}

/** These agents were deleted here. */
export function markRemoved(data: LunchData, ids: string[]): LunchData {
  const queue = queueOf(data)
  const gone = new Set(ids)
  return { ...data, roster: { ...queue, dirty: queue.dirty.filter((id) => !gone.has(id)), removed: unique([...queue.removed, ...ids]) } }
}

/** The roster was replaced by an import: the new agents are all to be sent, the old ones deleted, and nothing else kept. */
export function markReplaced(data: LunchData, oldIds: string[], newIds: string[]): LunchData {
  const queue = queueOf(data)
  const keep = new Set(newIds)
  return {
    ...data,
    roster: {
      synced: queue.synced,
      dirty: unique(newIds),
      removed: unique([...queue.removed, ...oldIds.filter((id) => !keep.has(id))]),
      replace: true,
    },
  }
}

/** True while there is something to do with the database: the first read, or changes not yet sent. */
export function hasWork(data: Pick<LunchData, 'roster'>): boolean {
  const queue = queueOf(data)
  return !queue.synced || queue.dirty.length > 0 || queue.removed.length > 0 || queue.replace === true
}

/** A short text that changes whenever the queue does, for an effect to depend on. */
export function queueKey(data: Pick<LunchData, 'roster'> | null): string {
  if (!data) return ''
  const queue = queueOf(data)
  return [queue.synced, queue.replace === true, queue.dirty.join(','), queue.removed.join(',')].join('|')
}

/* -- Sending ----------------------------------------------------------------- */

export type Push = { save: SharedAgent[]; remove: string[]; replace: boolean }

/**
 * What to send now. Before this computer has ever synced it sends nothing but asks for the shared roster, so a
 * roster that is already shared is never overwritten by an older one (see `applyRoster`): only what the shared
 * roster lacks is sent afterwards. A replacing import sends every agent.
 */
export function buildPush(data: LunchData): Push {
  const queue = queueOf(data)
  const dirty = new Set(queue.dirty)
  const replace = queue.replace === true
  return {
    save: data.agents.filter((a) => replace || dirty.has(a.id)).map((a) => ({ id: a.id, ...profileOf(a) })),
    remove: queue.removed,
    replace,
  }
}

/* -- Receiving --------------------------------------------------------------- */

const sameAgent = (a: Agent, b: Agent) =>
  a.id === b.id &&
  a.available === b.available &&
  a.yesterdayShift === b.yesterdayShift &&
  a.name === b.name &&
  a.chat === b.chat &&
  a.earlyShift === b.earlyShift &&
  a.languages.length === b.languages.length &&
  a.languages.every((l, i) => l === b.languages[i])

const sameQueue = (a: RosterQueue, b: RosterQueue) =>
  a.synced === b.synced &&
  (a.replace === true) === (b.replace === true) &&
  a.dirty.join(',') === b.dirty.join(',') &&
  a.removed.join(',') === b.removed.join(',')

/**
 * Brings the database's answer (`remote`, the whole shared roster after `sent` was applied) into the local data.
 *
 *  - What `sent` carried is no longer queued, unless it was edited again while the request was under way.
 *  - An agent is the same one when the id matches, or else when the name does (two computers that added "Ann"
 *    on their own); the local agent then takes the shared id, and the schedule is pointed at it.
 *  - The shared roster wins for agents that are not queued here: the profile, and the agent being there at all.
 *    An agent that is gone from it, was deleted by someone else, and is dropped (and from the schedule).
 *  - Queued changes are kept, whatever the shared roster says, and sent next.
 *  - An agent the shared roster does not know that was never sent (this computer's first sync, or the shared roster
 *    is empty, e.g. it was just set up) is queued to be sent, never dropped.
 *  - An agent only the shared roster has is added, with yesterday's shift and who was out filled in from the history.
 *
 * Returns `data` itself when nothing changes, so a poll that finds nothing new does not re-render or re-save.
 */
export function applyRoster(data: LunchData, remote: SharedAgent[], sent: Push, today: string): LunchData {
  const queue = queueOf(data)
  const sentById = new Map(sent.save.map((s) => [s.id, s]))

  const dirty = new Set(queue.dirty)
  for (const id of queue.dirty) {
    const local = data.agents.find((a) => a.id === id)
    const was = sentById.get(id)
    if (!local || (was && sameProfile(profileOf(local), was))) dirty.delete(id)
  }
  const removed = new Set(queue.removed)
  for (const id of sent.remove) removed.delete(id)
  const replace = queue.replace === true && !sent.replace

  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const remoteByName = new Map(remote.map((r) => [nameKey(r.name), r]))
  const used = new Set<string>()
  const adopted = new Map<string, string>()
  const dropped = new Set<string>()
  const agents: Agent[] = []

  for (const local of data.agents) {
    const hit = remoteById.get(local.id) ?? remoteByName.get(nameKey(local.name))
    const shared = hit && !used.has(hit.id) ? hit : undefined
    if (shared) {
      used.add(shared.id)
      if (shared.id !== local.id) {
        adopted.set(local.id, shared.id)
        if (dirty.delete(local.id)) dirty.add(shared.id)
      }
      if (dirty.has(shared.id)) {
        agents.push(shared.id === local.id ? local : { ...local, id: shared.id })
      } else {
        const same = sameProfile(profileOf(local), shared)
        agents.push(
          same && shared.id === local.id
            ? local
            : {
                ...local,
                id: shared.id,
                name: shared.name,
                // The same languages in another order keep the order this computer shows.
                languages: sameSet(local.languages, shared.languages) ? local.languages : [...shared.languages],
                chat: shared.chat,
                earlyShift: shared.earlyShift,
              },
        )
      }
    } else if (dirty.has(local.id)) {
      agents.push(local)
    } else if (!queue.synced || remote.length === 0) {
      agents.push(local)
      dirty.add(local.id)
    } else {
      dropped.add(local.id)
    }
  }

  const added = remote
    .filter((r) => !used.has(r.id) && !removed.has(r.id))
    .map((r): Agent => ({ id: r.id, name: r.name, languages: [...r.languages], chat: r.chat, earlyShift: r.earlyShift, available: true, yesterdayShift: null }))
  agents.push(...applyYesterday(added, data, today))

  const ids = new Set(agents.map((a) => a.id))
  const next: RosterQueue = {
    synced: true,
    dirty: [...dirty].filter((id) => ids.has(id)),
    removed: [...removed],
    ...(replace ? { replace: true } : {}),
  }

  const fix = (list: string[]) => list.flatMap((id) => (dropped.has(id) ? [] : [adopted.get(id) ?? id]))
  const schedule =
    data.schedule && (adopted.size > 0 || dropped.size > 0)
      ? { ...data.schedule, shift1: fix(data.schedule.shift1), shift2: fix(data.schedule.shift2) }
      : data.schedule

  const unchanged =
    agents.length === data.agents.length &&
    agents.every((a, i) => sameAgent(a, data.agents[i])) &&
    schedule === data.schedule &&
    data.roster !== undefined &&
    sameQueue(queue, next)
  return unchanged ? data : { ...data, agents, schedule, roster: next }
}

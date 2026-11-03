import { describe, expect, it } from 'vitest'
import { applyRoster, buildPush, changesProfile, hasWork, markDirty, markRemoved, markReplaced, queueOf, reviveRoster } from './sharedRoster'
import type { Push, SharedAgent } from './sharedRoster'
import { emptyLunchData, nameKey, reviveLunchData } from './roster'
import { agent as baseAgent } from './testHelpers'
import type { Agent, LunchData } from './types'

/** The test helper, with the id open to choice: two computers give the same agent different ids. */
const agent = (name: string, fields: Partial<Omit<Agent, 'name'>> = {}): Agent => ({ ...baseAgent(name), ...fields })

const TODAY = '2026-11-03'
const NONE: Push = { save: [], remove: [], replace: false }

const data = (agents: Agent[], extra: Partial<LunchData> = {}): LunchData => ({ ...emptyLunchData(), agents, syncedDate: TODAY, ...extra })
const synced = (agents: Agent[], extra: Partial<LunchData> = {}, queue: Partial<NonNullable<LunchData['roster']>> = {}) =>
  data(agents, { roster: { synced: true, dirty: [], removed: [], ...queue }, ...extra })
const shared = (name: string, fields: Partial<Omit<SharedAgent, 'id' | 'name'>> = {}, id = name.toLowerCase()): SharedAgent => ({
  id,
  name,
  languages: [],
  chat: false,
  earlyShift: false,
  ...fields,
})
const names = (d: LunchData) => d.agents.map((a) => a.name)

describe('reviveRoster', () => {
  it('reads the rows of the database', () => {
    expect(
      reviveRoster([{ id: 'a', name: ' Ann ', languages: ['Dutch', 'English', ' French '], chat: true, early_shift: true, updated_by: 'Nestor' }]),
    ).toEqual([{ id: 'a', name: 'Ann', languages: ['Dutch', 'French'], chat: true, earlyShift: true }])
  })

  it('skips what is malformed or repeated, but never turns an odd answer into an empty roster', () => {
    expect(reviveRoster({ message: 'x' })).toBeNull()
    expect(reviveRoster('nope')).toBeNull()
    const list = reviveRoster([null, 5, { id: '', name: 'No id' }, { id: 'a', name: '  ' }, { id: 'b', name: 'Bo' }, { id: 'b', name: 'Again' }, { id: 'c', name: 'BO' }])
    expect(list?.map((a) => a.id)).toEqual(['b'])
    expect(reviveRoster([])).toEqual([])
  })
})

describe('the queue', () => {
  it('marks added and edited agents, and deleted ones (a deleted agent is no longer a change to send)', () => {
    const start = data([agent('Ann'), agent('Bo')])
    const dirty = markDirty(markDirty(start, ['ann']), ['ann', 'bo'])
    expect(queueOf(dirty).dirty).toEqual(['ann', 'bo'])
    const gone = markRemoved(dirty, ['ann'])
    expect(queueOf(gone)).toMatchObject({ dirty: ['bo'], removed: ['ann'] })
  })

  it('only changes to who an agent is count, not "in today" or yesterday’s shift', () => {
    expect(changesProfile({ chat: true })).toBe(true)
    expect(changesProfile({ name: 'X' })).toBe(true)
    expect(changesProfile({ languages: [] })).toBe(true)
    expect(changesProfile({ earlyShift: false })).toBe(true)
    expect(changesProfile({ available: false })).toBe(false)
    expect(changesProfile({ yesterdayShift: 2 })).toBe(false)
  })

  it('has work until the first read, and while something is waiting to be sent', () => {
    expect(hasWork(data([]))).toBe(true)
    expect(hasWork(synced([]))).toBe(false)
    expect(hasWork(markDirty(synced([agent('Ann')]), ['ann']))).toBe(true)
    expect(hasWork(markRemoved(synced([]), ['x']))).toBe(true)
  })

  it('an import replaces everything: the new agents are all sent, the old ones deleted', () => {
    const next = markReplaced(synced([agent('New')], {}, { dirty: ['stale'] }), ['old', 'new'], ['new'])
    expect(queueOf(next)).toEqual({ synced: true, dirty: ['new'], removed: ['old'], replace: true })
  })

  it('survives being stored and read back', () => {
    const d = markReplaced(markRemoved(data([agent('Ann')]), ['gone']), ['x'], ['ann'])
    expect(reviveLunchData(JSON.parse(JSON.stringify(d)))?.roster).toEqual(d.roster)
    expect(reviveLunchData({ agents: [] })?.roster).toBeUndefined()
    expect(reviveLunchData({ roster: { synced: 'yes', dirty: [1, 'a', 'a'], removed: 'b' } })?.roster).toEqual({ synced: false, dirty: ['a'], removed: [] })
  })
})

describe('buildPush', () => {
  it('only reads the shared roster before this computer has ever synced', () => {
    expect(buildPush(data([agent('Ann')]))).toEqual(NONE)
  })

  it('sends the agents that were added or changed, and the ones deleted', () => {
    const d = synced([agent('Ann', { languages: ['Dutch'], chat: true }), agent('Bo')], {}, { dirty: ['ann'], removed: ['zed'] })
    expect(buildPush(d)).toEqual({
      save: [{ id: 'ann', name: 'Ann', languages: ['Dutch'], chat: true, earlyShift: false }],
      remove: ['zed'],
      replace: false,
    })
  })

  it('sends everybody when the roster was replaced', () => {
    const d = markReplaced(synced([agent('Ann'), agent('Bo')]), [], ['ann', 'bo'])
    expect(buildPush(d).save.map((a) => a.id)).toEqual(['ann', 'bo'])
    expect(buildPush(d).replace).toBe(true)
  })
})

describe('applyRoster: the first time', () => {
  it('queues this computer’s agents when nothing is shared yet, so they are sent next (the roster is set up from what is here)', () => {
    const local = data([agent('Ann', { languages: ['Dutch'] }), agent('Bo')])
    const next = applyRoster(local, [], buildPush(local), TODAY)
    expect(names(next)).toEqual(['Ann', 'Bo'])
    expect(queueOf(next)).toMatchObject({ synced: true, dirty: ['ann', 'bo'] })
    expect(buildPush(next).save.map((a) => a.name)).toEqual(['Ann', 'Bo'])
  })

  it('takes the shared roster as it is when this computer has none (a new phone)', () => {
    const local = data([])
    const next = applyRoster(local, [shared('Ann', { languages: ['Dutch'], chat: true }), shared('Bo', { earlyShift: true })], NONE, TODAY)
    expect(next.agents.map((a) => [a.name, a.languages, a.chat, a.earlyShift, a.available])).toEqual([
      ['Ann', ['Dutch'], true, false, true],
      ['Bo', [], false, true, true],
    ])
    expect(queueOf(next)).toEqual({ synced: true, dirty: [], removed: [] })
  })

  it('does not let an older roster overwrite the shared one: the shared profile wins, and only missing agents are sent', () => {
    const local = data([agent('Ann', { id: 'mine-ann', languages: ['French'], chat: true }), agent('Cleo', { id: 'mine-cleo' })])
    const next = applyRoster(local, [shared('ann', { languages: ['Dutch'] }, 'theirs-ann'), shared('Bo')], NONE, TODAY)
    const ann = next.agents.find((a) => a.id === 'theirs-ann')
    expect(ann).toMatchObject({ name: 'ann', languages: ['Dutch'], chat: false })
    expect(names(next).sort()).toEqual(['Bo', 'Cleo', 'ann'])
    expect(queueOf(next).dirty).toEqual(['mine-cleo'])
  })

  it('points the schedule at the shared id when an agent takes it', () => {
    const local = data([agent('Ann', { id: 'mine' })], { schedule: { date: TODAY, shift1: ['mine'], shift2: [] } })
    const next = applyRoster(local, [shared('Ann', {}, 'theirs')], NONE, TODAY)
    expect(next.schedule?.shift1).toEqual(['theirs'])
  })
})

describe('applyRoster: after that', () => {
  it('adds an agent someone else added, with yesterday’s shift and who was out filled in from the history', () => {
    const history = [{ date: '2026-11-02', shift1: ['Ann'], shift2: ['Bo'], chat: [], out: ['Cleo'], notes: [] }]
    const local = synced([agent('Ann')], { history })
    const next = applyRoster(local, [shared('Ann'), shared('Bo'), shared('Cleo')], NONE, TODAY)
    expect(next.agents.map((a) => [a.name, a.yesterdayShift, a.available])).toEqual([
      ['Ann', null, true],
      ['Bo', 2, true],
      ['Cleo', null, false],
    ])
  })

  it('drops an agent someone else deleted, from the schedule too', () => {
    const local = synced([agent('Ann'), agent('Bo')], { schedule: { date: TODAY, shift1: ['ann'], shift2: ['bo'] } })
    const next = applyRoster(local, [shared('Ann')], NONE, TODAY)
    expect(names(next)).toEqual(['Ann'])
    expect(next.schedule).toEqual({ date: TODAY, shift1: ['ann'], shift2: [] })
  })

  it('follows a change someone else made, and leaves today’s state of the agent alone', () => {
    const local = synced([agent('Ann', { available: false, yesterdayShift: 1, languages: ['Dutch', 'French'] })])
    const next = applyRoster(local, [shared('Ann', { languages: ['French', 'Dutch', 'German'], earlyShift: true })], NONE, TODAY)
    expect(next.agents[0]).toMatchObject({ available: false, yesterdayShift: 1, languages: ['French', 'Dutch', 'German'], earlyShift: true })
  })

  it('keeps the order of the languages when they are the same ones', () => {
    const local = synced([agent('Ann', { languages: ['French', 'Dutch'] })])
    const next = applyRoster(local, [shared('Ann', { languages: ['Dutch', 'French'] })], NONE, TODAY)
    expect(next).toBe(local)
  })

  it('does not overwrite a change that was made here and not sent yet', () => {
    const local = synced([agent('Ann', { chat: true })], {}, { dirty: ['ann'] })
    const next = applyRoster(local, [shared('Ann', { chat: false })], NONE, TODAY)
    expect(next.agents[0].chat).toBe(true)
    expect(queueOf(next).dirty).toEqual(['ann'])
  })

  it('keeps an agent that was added here and not sent yet, and one that was deleted here but is still shared', () => {
    const local = synced([agent('New')], {}, { dirty: ['new'], removed: ['bo'] })
    const next = applyRoster(local, [shared('Bo')], NONE, TODAY)
    expect(names(next)).toEqual(['New'])
    expect(queueOf(next)).toMatchObject({ dirty: ['new'], removed: ['bo'] })
  })

  it('clears what was sent, but keeps an edit made while the request was under way', () => {
    const sentAgent = agent('Ann', { chat: true })
    const sent: Push = { save: [{ id: 'ann', name: 'Ann', languages: [], chat: true, earlyShift: false }], remove: ['zed'], replace: false }
    const quiet = applyRoster(synced([sentAgent], {}, { dirty: ['ann'], removed: ['zed'] }), [shared('Ann', { chat: true })], sent, TODAY)
    expect(queueOf(quiet)).toEqual({ synced: true, dirty: [], removed: [] })

    const edited = synced([agent('Ann', { chat: true, earlyShift: true })], {}, { dirty: ['ann'], removed: ['zed'] })
    const next = applyRoster(edited, [shared('Ann', { chat: true })], sent, TODAY)
    expect(next.agents[0].earlyShift).toBe(true)
    expect(queueOf(next)).toEqual({ synced: true, dirty: ['ann'], removed: [] })
  })

  it('sends everything again when the shared roster turns out to be empty (it was just set up, or reset)', () => {
    const local = synced([agent('Ann'), agent('Bo')])
    const next = applyRoster(local, [], NONE, TODAY)
    expect(names(next)).toEqual(['Ann', 'Bo'])
    expect(queueOf(next).dirty).toEqual(['ann', 'bo'])
  })

  it('stops replacing once the replacing send went through', () => {
    const imported = markReplaced(synced([agent('Ann')]), ['old'], ['ann'])
    const push = buildPush(imported)
    const next = applyRoster(imported, [shared('Ann')], push, TODAY)
    expect(queueOf(next)).toEqual({ synced: true, dirty: [], removed: [] })
  })

  it('returns the same data when nothing changed, so a poll that finds nothing does not re-render or re-save', () => {
    const local = synced([agent('Ann', { languages: ['Dutch'] }), agent('Bo')])
    expect(applyRoster(local, [shared('Ann', { languages: ['Dutch'] }), shared('Bo')], NONE, TODAY)).toBe(local)
  })
})

/* -- Two computers and one database ------------------------------------------ */

/**
 * The database, as supabase/lunch_roster.sql behaves: an agent is the same one by id or else by name, a delete goes first,
 * a replace keeps only what came, and the whole roster comes back.
 */
function database() {
  let rows: SharedAgent[] = []
  return {
    rows: () => rows,
    sync(push: Push): SharedAgent[] {
      rows = rows.filter((r) => !push.remove.includes(r.id))
      if (push.replace) rows = rows.filter((r) => push.save.some((s) => s.id === r.id || nameKey(s.name) === nameKey(r.name)))
      for (const s of push.save) {
        const at = rows.findIndex((r) => r.id === s.id)
        const byName = rows.findIndex((r) => nameKey(r.name) === nameKey(s.name))
        if (at >= 0) rows[at] = { ...s }
        else if (byName >= 0) rows[byName] = { ...s, id: rows[byName].id }
        else rows.push({ ...s })
      }
      return rows.map((r) => ({ ...r, languages: [...r.languages] }))
    },
  }
}

/** One computer: what the hook does on every round (send what is queued, merge the answer). */
function computer(db: ReturnType<typeof database>, start: LunchData) {
  let state = start
  return {
    get state() {
      return state
    },
    set state(next: LunchData) {
      state = next
    },
    round() {
      const push = buildPush(state)
      state = applyRoster(state, db.sync(push), push, TODAY)
    },
    /** Rounds until nothing is waiting any more, like the hook's timer does. */
    settle() {
      for (let i = 0; i < 5; i++) {
        this.round()
        if (!hasWork(state)) return
      }
      throw new Error('never settled')
    },
  }
}

describe('two computers and one database', () => {
  const profile = (d: LunchData) => d.agents.map((a) => [a.name, a.languages.join('+'), a.chat, a.earlyShift]).sort()

  it('share one roster: the first uploads it, the next takes it, and every edit, add and delete follows', () => {
    const db = database()
    const nestor = computer(db, data([agent('Ann', { id: 'n-ann', languages: ['Dutch'], chat: true }), agent('Bo', { id: 'n-bo' })]))
    nestor.settle()
    expect(db.rows().map((r) => r.name)).toEqual(['Ann', 'Bo'])

    // Kevin C has an older roster of his own: the shared profile of Ann wins, and his extra agent joins the shared roster.
    const kevin = computer(db, data([agent('Ann', { id: 'k-ann', languages: ['French'] }), agent('Cleo', { id: 'k-cleo', languages: ['German'] })]))
    kevin.settle()
    nestor.settle()
    expect(profile(kevin.state)).toEqual(profile(nestor.state))
    expect(profile(nestor.state)).toEqual([
      ['Ann', 'Dutch', true, false],
      ['Bo', '', false, false],
      ['Cleo', 'German', false, false],
    ])

    // Nestor edits and adds, Kevin deletes.
    nestor.state = markDirty({ ...nestor.state, agents: nestor.state.agents.map((a) => (a.name === 'Bo' ? { ...a, earlyShift: true } : a)) }, [nestor.state.agents.find((a) => a.name === 'Bo')!.id])
    const dora = agent('Dora', { id: 'n-dora' })
    nestor.state = markDirty({ ...nestor.state, agents: [...nestor.state.agents, dora] }, ['n-dora'])
    const cleo = kevin.state.agents.find((a) => a.name === 'Cleo')!
    kevin.state = markRemoved({ ...kevin.state, agents: kevin.state.agents.filter((a) => a.id !== cleo.id) }, [cleo.id])
    nestor.settle()
    kevin.settle()
    nestor.settle()
    expect(profile(kevin.state)).toEqual(profile(nestor.state))
    expect(profile(nestor.state).map((p) => p[0])).toEqual(['Ann', 'Bo', 'Dora'])
    expect(nestor.state.agents.find((a) => a.name === 'Bo')?.earlyShift).toBe(true)
  })

  it('keep what each marked for today to themselves', () => {
    const db = database()
    const nestor = computer(db, data([agent('Ann'), agent('Bo')]))
    const kevin = computer(db, data([]))
    nestor.settle()
    kevin.settle()
    nestor.state = { ...nestor.state, agents: nestor.state.agents.map((a) => (a.name === 'Bo' ? { ...a, available: false } : a)) }
    nestor.settle()
    kevin.settle()
    expect(kevin.state.agents.find((a) => a.name === 'Bo')?.available).toBe(true)
    expect(nestor.state.agents.find((a) => a.name === 'Bo')?.available).toBe(false)
  })

  it('end up with one agent when both add the same name at the same time', () => {
    const db = database()
    const a = computer(db, synced([]))
    const b = computer(db, synced([]))
    a.state = markDirty({ ...a.state, agents: [agent('Zoe', { id: 'a-zoe', chat: true })] }, ['a-zoe'])
    b.state = markDirty({ ...b.state, agents: [agent('Zoe', { id: 'b-zoe', languages: ['Dutch'] })] }, ['b-zoe'])
    a.settle()
    b.settle()
    a.settle()
    expect(db.rows()).toHaveLength(1)
    expect(a.state.agents).toHaveLength(1)
    expect(profile(a.state)).toEqual(profile(b.state))
    expect(a.state.agents[0].id).toBe(b.state.agents[0].id)
  })

  it('send an offline edit later instead of losing it to the shared roster', () => {
    const db = database()
    const nestor = computer(db, data([agent('Ann', { id: 'n-ann' })]))
    nestor.settle()
    // Nestor edits with no connection (no round runs), meanwhile Kevin C changes something else about Ann.
    nestor.state = markDirty({ ...nestor.state, agents: nestor.state.agents.map((a) => ({ ...a, chat: true })) }, ['n-ann'])
    const kevin = computer(db, data([]))
    kevin.settle()
    kevin.state = markDirty({ ...kevin.state, agents: kevin.state.agents.map((a) => ({ ...a, earlyShift: true })) }, ['n-ann'])
    kevin.settle()
    // Nestor looks (a poll) before he is back online for sending: his own change is kept, then sent.
    nestor.state = applyRoster(nestor.state, db.rows(), NONE, TODAY)
    expect(nestor.state.agents[0].chat).toBe(true)
    nestor.settle()
    expect(db.rows()[0]).toMatchObject({ chat: true })
  })

  it('an import replaces the shared roster for everyone', () => {
    const db = database()
    const nestor = computer(db, data([agent('Ann', { id: 'n-ann' }), agent('Bo', { id: 'n-bo' })]))
    const kevin = computer(db, data([]))
    nestor.settle()
    kevin.settle()
    const imported = [agent('Ann', { id: 'i-ann', languages: ['Italian'] }), agent('Eve', { id: 'i-eve' })]
    nestor.state = markReplaced({ ...nestor.state, agents: imported, schedule: null }, ['n-ann', 'n-bo'], ['i-ann', 'i-eve'])
    nestor.settle()
    kevin.settle()
    expect(db.rows().map((r) => r.name)).toEqual(['Ann', 'Eve'])
    expect(profile(kevin.state)).toEqual(profile(nestor.state))
    expect(kevin.state.agents.find((a) => a.name === 'Ann')?.languages).toEqual(['Italian'])
  })
})

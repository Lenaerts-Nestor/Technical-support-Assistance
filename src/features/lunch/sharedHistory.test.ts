import { describe, expect, it } from 'vitest'
import { generateSchedule } from './scheduler'
import { adoptShared, sameShifts, scheduleFromShared, sharedToEntries } from './sharedHistory'
import { rollOver } from './roster'
import { agent } from './testHelpers'
import type { LunchData } from './types'
import type { SharedDay } from '../shift/shiftLogic'

const MON = '2026-10-19'
const TUE = '2026-10-20'

const published = (over: Partial<SharedDay> = {}): SharedDay => ({
  day: MON,
  shift1: ['Ann', 'Cy'],
  shift2: ['Bo', 'Di'],
  team: ['Ann', 'Bo', 'Cy', 'Di', 'Eve'],
  chat: [],
  out: ['Eve'],
  notes: [],
  publishedBy: 'Nestor',
  updatedAt: '',
  ...over,
})

/** Kevin's computer: his own roster, and nothing saved from Monday because Nestor made that schedule. */
const kevin = (over: Partial<LunchData> = {}): LunchData => ({
  agents: ['Ann', 'Bo', 'Cy', 'Di', 'Eve'].map((n) => agent(n)),
  history: [],
  schedule: null,
  syncedDate: TUE,
  ...over,
})

describe('adoptShared', () => {
  it("builds on the other publisher's schedule from the day before", () => {
    const next = adoptShared(kevin(), sharedToEntries([published()]), TUE)
    const shifts = Object.fromEntries(next.agents.map((a) => [a.name, a.yesterdayShift]))
    expect(shifts).toEqual({ Ann: 1, Bo: 2, Cy: 1, Di: 2, Eve: null })
    expect(next.agents.find((a) => a.name === 'Eve')?.available).toBe(false) // was out on Monday
    expect(next.history.map((e) => e.date)).toEqual([MON])
  })

  it('makes Generate turn that schedule around', () => {
    const next = adoptShared(kevin(), sharedToEntries([published()]), TUE)
    const { shift1, shift2 } = generateSchedule(next.agents.filter((a) => a.available))
    // Monday's Shift 1 (Ann, Cy) goes to Shift 2 and the other way round.
    expect(shift2.sort()).toEqual(['ann', 'cy'])
    expect(shift1.sort()).toEqual(['bo', 'di'])
  })

  it('does it only once: later edits to availability are kept', () => {
    const entries = sharedToEntries([published()])
    const once = adoptShared(kevin(), entries, TUE)
    const edited = { ...once, agents: once.agents.map((a) => (a.name === 'Bo' ? { ...a, available: false } : a)) }
    const again = adoptShared(edited, entries, TUE)
    expect(again.agents.find((a) => a.name === 'Bo')?.available).toBe(false)
  })

  it('lets a published day replace the same day saved on this computer', () => {
    const own = { date: MON, shift1: ['Zed'], shift2: [], chat: [], out: [], notes: [] }
    const next = adoptShared(kevin({ history: [own] }), sharedToEntries([published()]), TUE)
    expect(next.history).toHaveLength(1)
    expect(next.history[0].shift1).toEqual(['Ann', 'Cy'])
  })

  it('leaves the data alone when only today (or nothing) is published', () => {
    const data = kevin()
    expect(adoptShared(data, [], TUE)).toBe(data)
    expect(adoptShared(data, sharedToEntries([published({ day: TUE })]), TUE)).toBe(data)
  })

  it('also works when the new day has not been rolled over yet', () => {
    const fresh = kevin({ syncedDate: MON })
    const next = rollOver(adoptShared(fresh, sharedToEntries([published()]), TUE), TUE)
    expect(next.agents.find((a) => a.name === 'Ann')?.yesterdayShift).toBe(1)
    expect(next.agents.find((a) => a.name === 'Eve')?.available).toBe(false)
  })

  it('reads Friday on a Monday', () => {
    const fri = published({ day: '2026-10-16' })
    const next = adoptShared(kevin({ syncedDate: MON }), sharedToEntries([fri]), MON)
    expect(next.sharedKey).toContain('2026-10-16')
  })
})

describe('scheduleFromShared', () => {
  it('maps the published names onto this roster and reports the ones it lacks', () => {
    const agents = [agent('Ann'), agent('Bo'), agent('Eve')]
    const entry = sharedToEntries([published({ shift1: ['ann', 'Cy'], shift2: ['Bo'], out: ['Eve'] })])[0]
    const result = scheduleFromShared(entry, agents, TUE)
    expect(result.schedule).toEqual({ date: TUE, shift1: ['ann'], shift2: ['bo'] })
    expect(result.unknown).toEqual(['Cy'])
    expect([...result.present].sort()).toEqual(['ann', 'bo'])
    expect([...result.away]).toEqual(['eve'])
  })
})

describe('sameShifts', () => {
  it('ignores order and case, not who is where', () => {
    expect(sameShifts({ shift1: ['A', 'b'], shift2: ['C'] }, { shift1: ['B', 'a'], shift2: ['c'] })).toBe(true)
    expect(sameShifts({ shift1: ['A'], shift2: ['C'] }, { shift1: ['C'], shift2: ['A'] })).toBe(false)
  })
})

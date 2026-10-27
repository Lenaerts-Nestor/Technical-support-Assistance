import { describe, expect, it } from 'vitest'
import { lastWorkingEntry, mergeHistory, recentHistory, saveEntry, shiftOnEntry } from './history'
import { exportJson, parseImport, parseRosterCsv, rosterToCsv } from './lunchFile'
import { applyYesterday, filterAgents, reviveLunchData, rollOver, sortAgents } from './roster'
import { teamsHtml, teamsText } from './teamsText'
import { agent } from './testHelpers'
import type { HistoryEntry, LunchData } from './types'

const entry = (date: string, shift1: string[] = [], shift2: string[] = []): HistoryEntry => ({
  date,
  shift1,
  shift2,
  chat: [],
  out: [],
  notes: [],
})

describe('history', () => {
  it('reads Friday on a Monday and the day before otherwise', () => {
    const history = [entry('2026-10-15'), entry('2026-10-16'), entry('2026-10-12')]
    expect(lastWorkingEntry(history, '2026-10-19')?.date).toBe('2026-10-16') // Monday → Friday
    expect(lastWorkingEntry(history, '2026-10-16')?.date).toBe('2026-10-15') // never the same day
    expect(lastWorkingEntry(history, '2026-10-13')?.date).toBe('2026-10-12')
    expect(lastWorkingEntry([], '2026-10-13')).toBeNull()
  })

  it('skips an entry saved on a weekend', () => {
    expect(lastWorkingEntry([entry('2026-10-16'), entry('2026-10-18')], '2026-10-19')?.date).toBe('2026-10-16')
  })

  it('matches names without caring about case or spaces', () => {
    const e = entry('2026-10-16', ['Anna '], ['bram'])
    expect(shiftOnEntry(e, 'anna')).toBe(1)
    expect(shiftOnEntry(e, 'BRAM')).toBe(2)
    expect(shiftOnEntry(e, 'Cleo')).toBeNull()
  })

  it('keeps one entry per day and only the last 30 days', () => {
    const today = '2026-10-22'
    let history = saveEntry([], entry('2026-09-01'), today) // too old
    expect(history).toEqual([])
    history = saveEntry(history, entry('2026-10-21', ['A']), today)
    history = saveEntry(history, entry('2026-10-21', ['B']), today)
    expect(history).toHaveLength(1)
    expect(history[0].shift1).toEqual(['B'])
    history = saveEntry(history, entry('2026-10-22'), today)
    expect(recentHistory(history, today).map((e) => e.date)).toEqual(['2026-10-22', '2026-10-21'])
  })

  it('merges imported days over existing ones', () => {
    const merged = mergeHistory([entry('2026-10-21', ['old'])], [entry('2026-10-21', ['new']), entry('2026-10-20')], '2026-10-22')
    expect(merged.find((e) => e.date === '2026-10-21')?.shift1).toEqual(['new'])
    expect(merged).toHaveLength(2)
  })
})

describe('a new day', () => {
  const data = (over: Partial<LunchData> = {}): LunchData => ({
    agents: [agent('Anna', { available: false, yesterdayShift: 2 }), agent('Bram'), agent('Cleo')],
    history: [entry('2026-10-16', ['Anna'], ['Bram'])],
    schedule: { date: '2026-10-16', shift1: ['anna'], shift2: [] },
    syncedDate: '2026-10-16',
    ...over,
  })

  it('fills yesterday from history, takes availability from the last saved day and drops the old schedule', () => {
    const next = rollOver(data(), '2026-10-19') // Monday
    expect(next.agents.map((a) => a.yesterdayShift)).toEqual([1, 2, null])
    expect(next.agents.map((a) => a.available)).toEqual([true, true, true])
    expect(next.schedule).toBeNull()
    expect(next.syncedDate).toBe('2026-10-19')
  })

  it('files an unsaved schedule in the history so tomorrow can read it', () => {
    const next = rollOver(
      data({
        agents: [agent('Anna'), agent('Bram'), agent('Cleo', { available: false })],
        history: [],
        schedule: { date: '2026-10-16', shift1: ['bram'], shift2: ['anna', 'cleo'] },
      }),
      '2026-10-19',
    )
    expect(next.history).toHaveLength(1)
    expect(next.history[0]).toMatchObject({ date: '2026-10-16', shift1: ['Bram'], shift2: ['Anna'], out: ['Cleo'] })
    expect(next.agents.map((a) => a.yesterdayShift)).toEqual([2, 1, null])
  })

  it('marks whoever was out in the last saved day as not available', () => {
    const entryWithOut = { ...entry('2026-10-16', ['Anna'], ['Bram']), out: ['cleo'] }
    const next = applyYesterday(
      [agent('Anna', { available: false }), agent('Bram'), agent('Cleo'), agent('Dora', { available: false })],
      { history: [entryWithOut] },
      '2026-10-19',
    )
    expect(next.map((a) => a.available)).toEqual([true, true, false, false]) // Dora is not in the entry: unchanged
    expect(next.map((a) => a.yesterdayShift)).toEqual([1, 2, null, null])
  })

  it('keeps a day that was saved on purpose', () => {
    const saved = data()
    expect(rollOver(saved, '2026-10-19').history).toEqual(saved.history)
  })

  it('runs once per day and keeps manual edits made afterwards', () => {
    const once = rollOver(data(), '2026-10-19')
    expect(rollOver(once, '2026-10-19')).toBe(once)
  })

  it('keeps a schedule generated today', () => {
    const next = rollOver(data({ syncedDate: '', schedule: { date: '2026-10-19', shift1: ['anna'], shift2: [] } }), '2026-10-19')
    expect(next.schedule).not.toBeNull()
  })

  it('leaves the roster as typed when nothing was ever saved', () => {
    const agents = [agent('Anna', { yesterdayShift: 2 })]
    expect(applyYesterday(agents, { history: [] }, '2026-10-19')).toBe(agents)
  })
})

describe('roster table', () => {
  const agents = [
    agent('Bram', { languages: ['Dutch'], available: false, yesterdayShift: 2 }),
    agent('anna', { languages: ['French'], chat: true, yesterdayShift: 1 }),
    agent('Cleo', { languages: ['German'] }),
  ]

  it('searches names and languages, by name or code, and filters on availability', () => {
    expect(filterAgents(agents, 'ann', 'all').map((a) => a.name)).toEqual(['anna'])
    expect(filterAgents(agents, 'dutch', 'all').map((a) => a.name)).toEqual(['Bram'])
    expect(filterAgents(agents, 'FR', 'all').map((a) => a.name)).toEqual(['anna'])
    expect(filterAgents(agents, '', 'away').map((a) => a.name)).toEqual(['Bram'])
    expect(filterAgents(agents, '', 'available')).toHaveLength(2)
  })

  it('sorts either way and keeps empty values last', () => {
    const names = (list: typeof agents) => list.map((a) => a.name)
    expect(names(sortAgents(agents, (a) => a.name, 'asc'))).toEqual(['anna', 'Bram', 'Cleo'])
    expect(names(sortAgents(agents, (a) => a.name, 'desc'))).toEqual(['Cleo', 'Bram', 'anna'])
    expect(names(sortAgents(agents, (a) => a.yesterdayShift, 'asc'))).toEqual(['anna', 'Bram', 'Cleo'])
    expect(names(sortAgents(agents, (a) => a.yesterdayShift, 'desc'))).toEqual(['Bram', 'anna', 'Cleo'])
  })
})

describe('stored data', () => {
  it('survives garbage and fills in what an older version lacked', () => {
    expect(reviveLunchData('nope')).toBeNull()
    const data = reviveLunchData({ agents: [{ name: ' Anna ' }, { name: 'anna' }, { nope: 1 }, 7], history: 'x' })
    expect(data?.agents).toHaveLength(1)
    expect(data?.agents[0]).toMatchObject({ name: 'Anna', available: true, chat: false, yesterdayShift: null, languages: [] })
    expect(data?.history).toEqual([])
  })
})

describe('English', () => {
  it('is dropped from stored agents and imports, since everybody speaks it', () => {
    const data = reviveLunchData({ agents: [{ name: 'Anna', languages: ['Dutch', 'English', 'en'] }] })
    expect(data?.agents[0].languages).toEqual(['Dutch'])
    const { agents, unknownLanguages } = parseRosterCsv('Name,Languages\nAnna,"Dutch, English, EN"')
    expect(agents[0].languages).toEqual(['Dutch'])
    expect(unknownLanguages).toEqual([])
  })
})

describe('roster CSV', () => {
  it('reads the columns of the table, whatever their order, case or delimiter', () => {
    const text = [
      "Available today;Agent name;Languages;Yesterday's shift;Chat agent;Early shift",
      'Yes;Anna;Dutch, Italian;1;Yes;No',
      'No;"Bram, B.";"fr;DE";2;no;ja',
      ';Cleo;;;;',
    ].join('\n')
    const { agents } = parseRosterCsv(text)
    expect(agents.map((a) => a.name)).toEqual(['Anna', 'Bram, B.', 'Cleo'])
    expect(agents[0]).toMatchObject({ languages: ['Dutch', 'Italian'], available: true, yesterdayShift: 1, chat: true, earlyShift: false })
    expect(agents[1]).toMatchObject({ languages: ['French', 'German'], available: false, yesterdayShift: 2, chat: false, earlyShift: true })
    expect(agents[2]).toMatchObject({ available: true, languages: [], yesterdayShift: null })
  })

  it('reports duplicate and unnamed rows and unknown languages', () => {
    const result = parseRosterCsv('Name,Languages\nAnna,Klingon\nanna,Dutch\n,French')
    expect(result.agents).toHaveLength(1)
    expect(result.skipped).toBe(2)
    expect(result.unknownLanguages).toEqual(['Klingon'])
  })

  it('asks for a name column', () => {
    expect(() => parseRosterCsv('Foo,Bar\n1,2')).toThrow(/Agent name/)
  })

  it('round-trips through export', () => {
    const roster = [
      agent('Anna "A" Smith', { languages: ['Dutch', 'French'], chat: true, yesterdayShift: 2 }),
      agent('Bram, Jr', { earlyShift: true, available: false }),
    ]
    const back = parseRosterCsv(rosterToCsv(roster)).agents
    const withoutId = (list: typeof roster) => list.map((a) => ({ ...a, id: '' }))
    expect(withoutId(back)).toEqual(withoutId(roster))
  })
})

describe('import', () => {
  it('reads a JSON backup with history, and plain CSV without', () => {
    const roster = [agent('Anna', { languages: ['Dutch'] })]
    const json = parseImport(exportJson(roster, [entry('2026-10-21', ['Anna'])]))
    expect(json.agents).toHaveLength(1)
    expect(json.history).toHaveLength(1)
    expect(parseImport('Agent name\nAnna').history).toBeNull()
  })

  it('gives readable errors', () => {
    expect(() => parseImport('')).toThrow(/empty/)
    expect(() => parseImport('{oops')).toThrow(/JSON/)
    expect(() => parseImport('{"x":1}')).toThrow(/agents/)
  })
})

describe('teamsText', () => {
  const day = { shift1: ['Anna', 'Bram'], shift2: ['Cleo'], chat: ['Anna', 'Cleo'], out: ['Dirk'], notes: [] as string[] }

  it('writes the agreed plain-text layout, with a blank line between the sections', () => {
    expect(teamsText(day)).toBe(
      [
        "TODAY'S SCHEDULE",
        '',
        'LUNCH SHIFT:',
        '1st: Anna, Bram',
        '2nd: Cleo',
        '',
        'CHAT',
        'Anna, Cleo',
        '',
        'PTO/OOO',
        'Dirk',
      ].join('\n'),
    )
  })

  it('adds NOTES only when there are warnings', () => {
    const text = teamsText({ ...day, notes: ['No Dutch speaker in Shift 2'], out: [] })
    expect(text.endsWith('PTO/OOO\n-\n\nNOTES\nNo Dutch speaker in Shift 2')).toBe(true)
    expect(teamsText(day)).not.toContain('NOTES')
  })

  it('bolds the headings in the rich copy and escapes names', () => {
    const html = teamsHtml({ ...day, shift1: ['A<b>'] })
    for (const heading of ["TODAY'S SCHEDULE", 'LUNCH SHIFT:', 'CHAT', 'PTO/OOO']) expect(html).toContain(`<b>${heading}</b>`)
    expect(html).toContain('1st: A&lt;b&gt;')
    expect(html).not.toContain('<b>1st')
    expect(html).not.toContain('NOTES')
  })
})

import { describe, expect, it } from 'vitest'
import {
  addDays,
  countDays,
  datesBetween,
  groupRuns,
  monthCells,
  parseIso,
  reviveEntries,
  shiftMonth,
  todayIso,
  upcomingRuns,
  weekdayIndex,
} from './calendarData'
import type { CalendarEntry } from './types'

const pto = (date: string): CalendarEntry => ({ date, kind: 'pto', note: '' })
const other = (date: string, note = ''): CalendarEntry => ({ date, kind: 'other', note })

describe('dates', () => {
  it('validates real dates only', () => {
    expect(parseIso('2026-10-15')).toEqual({ year: 2026, month: 9, day: 15 })
    expect(parseIso('2026-02-30')).toBeNull()
    expect(parseIso('2026-2-3')).toBeNull()
    expect(parseIso(20261015)).toBeNull()
  })

  it('counts weekdays from Monday and crosses month and year ends', () => {
    expect(weekdayIndex('2026-10-12')).toBe(0)
    expect(weekdayIndex('2026-10-18')).toBe(6)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('reads today in the local time zone', () => {
    expect(todayIso(new Date(2026, 9, 15, 23, 59))).toBe('2026-10-15')
    expect(todayIso(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('shifts months across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2026, month: 5 }, 12)).toEqual({ year: 2027, month: 5 })
  })
})

describe('monthCells', () => {
  it('lays out whole Monday-first weeks', () => {
    const cells = monthCells({ year: 2026, month: 9 }) // October 2026 starts on a Thursday
    expect(cells.length % 7).toBe(0)
    expect(cells[0].iso).toBe('2026-09-28')
    expect(cells[0].inMonth).toBe(false)
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
    expect(cells[cells.length - 1].iso).toBe('2026-11-01')
  })

  it('needs only four rows for a Monday-to-Sunday February', () => {
    expect(monthCells({ year: 2027, month: 1 })).toHaveLength(28)
  })
})

describe('datesBetween', () => {
  it('lists a span inclusively', () => {
    expect(datesBetween('2026-10-14', '2026-10-16', false)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16'])
  })

  it('skips weekends in a span but still marks a single weekend day', () => {
    expect(datesBetween('2026-10-16', '2026-10-20', true)).toEqual(['2026-10-16', '2026-10-19', '2026-10-20'])
    expect(datesBetween('2026-10-17', '2026-10-17', true)).toEqual(['2026-10-17'])
  })

  it('refuses backwards or invalid spans and caps long ones', () => {
    expect(datesBetween('2026-10-16', '2026-10-15', false)).toEqual([])
    expect(datesBetween('', '2026-10-15', false)).toEqual([])
    expect(datesBetween('2026-01-01', '2030-01-01', false)).toHaveLength(366)
  })
})

describe('reviveEntries', () => {
  it('accepts a bare list or { entries } and sorts by date', () => {
    const raw = [{ date: '2026-11-02', kind: 'pto' }, { date: '2026-10-01', kind: 'other', note: ' Doctor ' }]
    expect(reviveEntries({ entries: raw })).toEqual([other('2026-10-01', 'Doctor'), pto('2026-11-02')])
    expect(reviveEntries(raw)).toHaveLength(2)
  })

  it('drops bad dates, keeps one entry per date and ignores notes on PTO', () => {
    const result = reviveEntries([
      { date: 'soon', kind: 'pto' },
      { date: '2026-02-30', kind: 'pto' },
      null,
      { date: '2026-10-01', kind: 'pto', note: 'ignored' },
      { date: '2026-10-01', kind: 'other', note: 'wins' },
    ])
    expect(result).toEqual([other('2026-10-01', 'wins')])
  })

  it('rejects anything that is not a list', () => {
    expect(reviveEntries({})).toBeNull()
    expect(reviveEntries('x')).toBeNull()
    expect(reviveEntries(null)).toBeNull()
  })
})

describe('groupRuns / upcomingRuns', () => {
  it('joins a working week, including across the weekend', () => {
    const runs = groupRuns([pto('2026-10-15'), pto('2026-10-16'), pto('2026-10-19'), pto('2026-10-20')])
    expect(runs).toEqual([{ start: '2026-10-15', end: '2026-10-20', kind: 'pto', note: '', days: 4 }])
  })

  it('keeps a gap, a different kind or a different note apart', () => {
    expect(groupRuns([pto('2026-10-14'), pto('2026-10-16')])).toHaveLength(2)
    expect(groupRuns([pto('2026-10-14'), other('2026-10-15')])).toHaveLength(2)
    expect(groupRuns([other('2026-10-14', 'a'), other('2026-10-15', 'b')])).toHaveLength(2)
  })

  it('returns the next five events, counting one in progress and skipping the past', () => {
    const entries = [
      pto('2026-10-01'),
      pto('2026-10-14'),
      pto('2026-10-15'),
      pto('2026-10-16'),
      ...['2026-10-26', '2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24', '2026-12-01'].map(pto),
    ]
    const runs = upcomingRuns(entries, '2026-10-15', 5)
    expect(runs.map((r) => r.start)).toEqual(['2026-10-14', '2026-10-26', '2026-11-03', '2026-11-10', '2026-11-17'])
    expect(upcomingRuns(entries, '2026-12-02', 5)).toEqual([])
  })
})

describe('countDays', () => {
  it('counts each kind inside the year', () => {
    expect(countDays([pto('2026-01-02'), pto('2026-12-31'), other('2026-05-05'), pto('2027-01-01')], 2026)).toEqual({
      pto: 2,
      other: 1,
    })
  })
})

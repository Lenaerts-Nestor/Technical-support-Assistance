import { describe, expect, it } from 'vitest'
import { MASCOTS, dailyIndex, pickMascot, stepMascot } from './mascots'

describe('dailyIndex', () => {
  it('is stable for a date and always in range', () => {
    expect(dailyIndex('2026-10-16', 10)).toBe(dailyIndex('2026-10-16', 10))
    for (let day = 1; day <= 31; day++) {
      const i = dailyIndex(`2026-10-${String(day).padStart(2, '0')}`, 10)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(10)
    }
  })

  it('varies from day to day', () => {
    const picks = new Set(
      Array.from({ length: 30 }, (_, d) => dailyIndex(`2026-11-${String(d + 1).padStart(2, '0')}`, 10)),
    )
    expect(picks.size).toBeGreaterThan(3)
  })
})

describe('pickMascot', () => {
  it('uses the daily pick when nothing is chosen', () => {
    expect(pickMascot(MASCOTS, null, '2026-10-16')).toBe(MASCOTS[dailyIndex('2026-10-16', MASCOTS.length)])
  })

  it('honours a choice, and falls back when the choice no longer exists', () => {
    expect(pickMascot(MASCOTS, MASCOTS[3].src, '2026-10-16')).toBe(MASCOTS[3])
    expect(pickMascot(MASCOTS, 'https://gone.example/x', '2026-10-16')).toBe(
      MASCOTS[dailyIndex('2026-10-16', MASCOTS.length)],
    )
  })
})

describe('stepMascot', () => {
  it('wraps around both ends', () => {
    expect(stepMascot(MASCOTS, MASCOTS[MASCOTS.length - 1], 1)).toBe(MASCOTS[0])
    expect(stepMascot(MASCOTS, MASCOTS[0], -1)).toBe(MASCOTS[MASCOTS.length - 1])
  })
})

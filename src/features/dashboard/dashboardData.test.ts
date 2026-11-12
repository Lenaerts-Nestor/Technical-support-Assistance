import { describe, expect, it } from 'vitest'
import { lunchAlert } from './dashboardData'

const at = (h: number, m: number) => new Date(2026, 10, 12, h, m)

describe('lunchAlert', () => {
  it('says nothing without a shift', () => {
    expect(lunchAlert(null, at(11, 40))).toBeNull()
  })

  it('warns from 10 minutes before the window, counting down', () => {
    expect(lunchAlert(1, at(11, 34))).toBeNull()
    expect(lunchAlert(1, at(11, 35))).toEqual({ phase: 'soon', minutes: 10, start: 11 * 60 + 45 })
    expect(lunchAlert(1, at(11, 44))).toMatchObject({ phase: 'soon', minutes: 1 })
  })

  it('switches to "now" at the start and stays for 10 minutes', () => {
    expect(lunchAlert(1, at(11, 45))).toMatchObject({ phase: 'now', minutes: 0 })
    expect(lunchAlert(1, at(11, 54))).toMatchObject({ phase: 'now', minutes: 9 })
    expect(lunchAlert(1, at(11, 55))).toBeNull()
  })

  it('follows the second shift', () => {
    expect(lunchAlert(2, at(12, 25))).toMatchObject({ phase: 'soon', minutes: 5 })
    expect(lunchAlert(2, at(12, 36))).toMatchObject({ phase: 'now' })
    expect(lunchAlert(2, at(12, 40))).toBeNull()
  })
})

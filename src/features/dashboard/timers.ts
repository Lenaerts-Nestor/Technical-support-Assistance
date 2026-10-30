export type TimerKind = 'break' | 'lunch'

/** Personal countdowns. They differ only in length and wording. */
export const TIMERS: Record<TimerKind, { label: string; minutes: number; message: string }> = {
  break: { label: 'Break', minutes: 10, message: 'You are on your break' },
  lunch: { label: 'Lunch', minutes: 45, message: 'You are on your lunch' },
}

/** "14:05" — minutes and seconds left, never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

import { useEffect, useState } from 'react'
import { todayIso } from './calendarData'

/**
 * Today's date, kept current. Pages stay mounted for days, so the date is
 * re-read at midnight and whenever the window comes back into view (a laptop
 * that slept through midnight fires its timer late).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayIso())

  useEffect(() => {
    let timer: number
    const refresh = () => setToday(todayIso())
    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = window.setTimeout(() => {
        refresh()
        schedule()
      }, nextMidnight.getTime() - now.getTime())
    }
    schedule()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return today
}

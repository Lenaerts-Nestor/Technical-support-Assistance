import { useEffect, useState } from 'react'
import { LUNCH_SAVED_EVENT, lunchStorage } from '../lunch/lunchStorage'

/** The names on this computer's Lunch Planner roster; follows the roster as it is edited. */
export function useRosterNames(): string[] {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () =>
      void lunchStorage.load().then((data) => {
        if (!cancelled) setNames(data.agents.map((a) => a.name))
      })
    load()
    window.addEventListener(LUNCH_SAVED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(LUNCH_SAVED_EVENT, load)
    }
  }, [])
  return names
}

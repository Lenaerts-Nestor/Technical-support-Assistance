import { useCallback, useEffect, useState } from 'react'
import { storageKey } from '../shared/storage/usePersistentState'

const SEEN_KEY = storageKey('app', 'rulesSeenOn')

const pad = (n: number) => String(n).padStart(2, '0')

/** Today on this computer's clock, as `YYYY-MM-DD`: the notice comes back when this changes. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function storedDay(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** Also kept in memory, so blocked storage does not bring the notice back on every tab switch. */
let closedOn: string | null = null

const seenToday = () => closedOn === today() || storedDay() === today()

/** How long without a click, key press or looking at the tab counts as a break: the notice comes back after it. */
const IDLE_MS = 45 * 60 * 1000

/**
 * The "Future plans" notice: open on the first visit of each day, not on every reload. Closing it remembers
 * today's date; the sidebar's RULES button opens it again. It also returns when someone comes back from a
 * break (a lunch, a long call away from the screen) or after midnight, so a tab left open all day still
 * shows it again.
 */
export function useRulesNotice() {
  const [open, setOpen] = useState(() => !seenToday())

  useEffect(() => {
    let lastActive = Date.now()
    /** Any sign of life; the gap since the one before decides whether this is a return from a break. */
    const activity = () => {
      const now = Date.now()
      const away = now - lastActive >= IDLE_MS
      lastActive = now
      if (away || !seenToday()) setOpen(true)
    }
    const visibility = () => {
      if (document.visibilityState === 'visible') activity()
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
    }
  }, [])

  const show = useCallback(() => setOpen(true), [])
  const close = useCallback(() => {
    closedOn = today()
    try {
      window.localStorage.setItem(SEEN_KEY, today())
    } catch {
      // Storage blocked: it stays closed for this session only.
    }
    setOpen(false)
  }, [])

  return { open, show, close }
}

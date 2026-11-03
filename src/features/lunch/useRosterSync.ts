import { useCallback, useEffect, useRef, useState } from 'react'
import { POLL_MS, SHARED_SHIFT } from '../shift/config'
import { statusFor, syncRoster } from './rosterApi'
import type { RosterStatus } from './rosterApi'
import { applyRoster, buildPush, hasWork, queueKey } from './sharedRoster'
import type { LunchData } from './types'

/** How long a change settles before it is sent, so typing a name is one request and not one per letter. */
const SEND_DEBOUNCE_MS = 600

/** The shared roster is part of the shared lunch shift's Supabase project and is off while that has no key. */
const ENABLED = SHARED_SHIFT.key !== ''

type Options = {
  /** Who is syncing: one of the people who plan lunch, picked under "I am". `null` when nobody is, which turns it off. */
  by: string | null
  /** The data as the page has it, or `null` until it is loaded. */
  data: LunchData | null
  /** Changes the page's data (see `useLunchPlanner`). */
  update: (change: (d: LunchData) => LunchData) => void
  today: string
}

/**
 * Keeps this computer's roster and the shared one the same (see `sharedRoster.ts` for the rules). It looks when the
 * page opens, every 30 seconds while the window is visible and when it comes back, and sends changes a moment after they
 * are made. Nothing is ever lost to a failure: the changes stay queued in the data and go out when the service answers.
 * Renders nothing; returns where it stands, for the Agents card.
 */
export function useRosterSync({ by, data, update, today }: Options): RosterStatus {
  const [status, setStatus] = useState<RosterStatus>('syncing')
  // The newest of everything, so a request that took a while merges into what is on screen now, not what was.
  const latest = useRef({ data, update, today })
  useEffect(() => {
    latest.current = { data, update, today }
  })
  const running = useRef(false)
  const again = useRef(false)
  const flushRef = useRef<() => Promise<void>>(undefined)

  const flush = useCallback(async () => {
    if (!by) return
    if (running.current) {
      again.current = true
      return
    }
    const current = latest.current.data
    if (!current) return
    running.current = true
    try {
      const push = buildPush(current)
      const remote = await syncRoster(SHARED_SHIFT, by, push)
      const { update: apply, today: day } = latest.current
      apply((d) => applyRoster(d, remote, push, day))
      setStatus('synced')
    } catch (e) {
      setStatus(statusFor(e))
    } finally {
      running.current = false
      // Something asked while this was under way: go again, once the merged data has reached the page.
      if (again.current) {
        again.current = false
        window.setTimeout(() => void flushRef.current?.(), 150)
      }
    }
  }, [by])
  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  const ready = data !== null
  const pending = data !== null && hasWork(data)
  const key = queueKey(data)

  // Look: now, then every 30 seconds while the window is visible, and whenever it comes back.
  useEffect(() => {
    if (!ENABLED || !by || !ready) return
    const look = () => document.visibilityState === 'visible' && void flushRef.current?.()
    look()
    const timer = window.setInterval(look, POLL_MS)
    window.addEventListener('focus', look)
    document.addEventListener('visibilitychange', look)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', look)
      document.removeEventListener('visibilitychange', look)
    }
  }, [by, ready])

  // Send: a moment after the last change (the key changes with every change to the queue).
  useEffect(() => {
    if (!ENABLED || !by || !pending) return
    const timer = window.setTimeout(() => void flushRef.current?.(), SEND_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [by, pending, key])

  return ENABLED && by ? status : 'off'
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useToday } from '../calendar/useToday'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { POLL_MS, PUBLISHERS, SHARED_SHIFT } from './config'
import { SharedShiftContext } from './sharedShiftContext'
import type { SharedShiftController } from './sharedShiftContext'
import { fetchDays, publishDay } from './shiftApi'
import { choices, isPublisher, shiftFor, withDay } from './shiftLogic'
import type { PublishInput, SharedDay } from './shiftLogic'
import { useRosterNames } from './useRosterNames'

const enabled = SHARED_SHIFT.key !== ''

/**
 * Owns the shared lunch shift above the sidebar and every page (see `sharedShiftContext.ts`):
 * who this user is, the published days (looked up every 30 seconds and when the window
 * comes back), and publishing. Renders nothing of its own.
 */
export function SharedShiftProvider({ children }: { children: ReactNode }) {
  const today = useToday()
  const roster = useRosterNames()
  const [me, setMe] = usePersistentState<string | null>(
    storageKey('shift', 'me'),
    () => null,
    (raw) => (typeof raw === 'string' && raw.trim() ? raw : null),
  )
  const [days, setDays] = useState<SharedDay[]>([])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const load = () =>
      fetchDays(SHARED_SHIFT, controller.signal).then(setDays, () => {
        // Offline or the service is down: keep what is on screen and try again next time.
      })
    const poll = () => document.visibilityState === 'visible' && void load()
    void load()
    const timer = window.setInterval(poll, POLL_MS)
    window.addEventListener('focus', poll)
    document.addEventListener('visibilitychange', poll)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', poll)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [])

  const canPublish = enabled && isPublisher(me, PUBLISHERS)

  const publish = useCallback(
    async (input: PublishInput): Promise<boolean> => {
      if (!canPublish || !me) return false
      try {
        await publishDay(SHARED_SHIFT, me, input)
      } catch {
        return false
      }
      setDays((prev) => withDay(prev, { ...input, publishedBy: me, updatedAt: new Date().toISOString() }))
      return true
    },
    [canPublish, me],
  )

  const value = useMemo<SharedShiftController>(
    () => ({
      enabled,
      me,
      setMe,
      choices: choices(days, roster, me),
      myShift: shiftFor(days, today, me),
      canPublish,
      publish,
    }),
    [me, setMe, days, roster, today, canPublish, publish],
  )

  return <SharedShiftContext value={value}>{children}</SharedShiftContext>
}

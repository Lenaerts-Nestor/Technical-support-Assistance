import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUnits, saveUnits } from './unitsApi'
import type { Unit } from './types'

export type UnitsStatus = 'loading' | 'ready' | 'unavailable'

export type UnitDraft = Omit<Unit, 'id'>

/**
 * The saved unit cards. They live in a JSON file next to the project, written
 * by the local bridge — the browser only ever holds a copy.
 */
export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([])
  const [status, setStatus] = useState<UnitsStatus>('loading')
  const [saveError, setSaveError] = useState(false)
  // Saves run one after another so an older list can never overwrite a newer one.
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    fetchUnits()
      .then((loaded) => {
        if (cancelled) return
        setUnits(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback((next: Unit[]) => {
    setUnits(next)
    queue.current = queue.current
      .then(() => saveUnits(next))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true))
  }, [])

  const add = (draft: UnitDraft) => commit([...units, { id: crypto.randomUUID(), ...draft }])

  const update = (id: string, draft: UnitDraft) =>
    commit(units.map((u) => (u.id === id ? { id, ...draft } : u)))

  const remove = (id: string) => commit(units.filter((u) => u.id !== id))

  return { units, status, saveError, add, update, remove }
}

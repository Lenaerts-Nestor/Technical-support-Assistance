import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/** How long edits settle before the write to `localStorage`. */
const SAVE_DEBOUNCE_MS = 400

/** Namespace every key so the app's storage is obvious in devtools. */
export const storageKey = (feature: string, slice: string, version = 1) =>
  `support-hub:${feature}:${slice}:v${version}`

/**
 * `useState` that survives a reload. Used for the live scratchpads (Voice Call,
 * RMA, Cases) so an accidental refresh mid-call doesn't lose the form.
 *
 * The stored JSON goes through `revive` before it reaches state: it validates
 * the shape and fills in anything missing, so a value written by an older
 * version of the app can never reach the components. Returning `null` from
 * `revive` falls back to `initial()`.
 *
 * Reads and writes are both guarded — `localStorage` throws in private mode and
 * when the quota is full, and a scratchpad must not take the page down with it.
 * Bump the key's version rather than writing a migration.
 */
export function usePersistentState<T>(
  key: string,
  initial: () => T,
  revive: (raw: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored === null) return initial()
      return revive(JSON.parse(stored)) ?? initial()
    } catch {
      return initial()
    }
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Quota exceeded or storage blocked — the form still works in memory.
      }
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [key, value])

  return [value, setValue]
}

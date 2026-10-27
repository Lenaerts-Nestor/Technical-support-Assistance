import { storageKey } from '../../shared/storage/usePersistentState'
import { emptyLunchData, reviveLunchData } from './roster'
import type { LunchData } from './types'

/**
 * Where the Lunch Planner keeps its data. This is the ONLY file that knows about
 * `localStorage`: to move to a backend or a database, implement `LunchStorage`
 * against it and change the one line at the bottom. The calls are async from the
 * start so that swap needs no change anywhere else.
 *
 * The whole page state is stored as one snapshot. Bump the key's version rather
 * than writing a migration; `reviveLunchData` fills in anything an older snapshot lacks.
 */
export type LunchStorage = {
  load: () => Promise<LunchData>
  /** Rejects when the data could not be stored. */
  save: (data: LunchData) => Promise<void>
}

const KEY = storageKey('lunch', 'data')

/** Fired on `window` after every save, so the sidebar's "I am" list follows roster edits. */
export const LUNCH_SAVED_EVENT = 'support-hub:lunch-saved'

const localStorageBackend: LunchStorage = {
  async load() {
    try {
      const stored = window.localStorage.getItem(KEY)
      return (stored && reviveLunchData(JSON.parse(stored))) || emptyLunchData()
    } catch {
      // Blocked storage or a corrupt value: start empty rather than break the page.
      return emptyLunchData()
    }
  },
  async save(data) {
    window.localStorage.setItem(KEY, JSON.stringify(data))
    window.dispatchEvent(new Event(LUNCH_SAVED_EVENT))
  },
}

export const lunchStorage: LunchStorage = localStorageBackend

import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { nameKey } from '../lunch/roster'
import { SHARED_SHIFT } from '../shift/config'
import { NOTE_MAX_LENGTH, reviveEntries, sortEntries } from './calendarData'
import { fetchCalendar, saveCalendar } from './calendarApi'
import { readCalendarFile, writeCalendarFile } from './calendarFile'
import type { FolderLink } from '../sync/useFolderLifecycle'
import type { CalendarEntry, LeaveKind } from './types'

const CALENDAR_KEY = storageKey('calendar', 'entries')
/** Whose calendar the days in this browser last belonged to (see `useCalendar`). */
const OWNER_KEY = storageKey('calendar', 'owner')
const FILE_DEBOUNCE_MS = 600
const DATABASE_DEBOUNCE_MS = 800

/** The database is the lunch shift's Supabase project; it is off while that has no key. */
const DATABASE_ENABLED = SHARED_SHIFT.key !== ''

const readOwner = (): string | null => {
  try {
    return window.localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

const writeOwner = (person: string) => {
  try {
    window.localStorage.setItem(OWNER_KEY, nameKey(person))
  } catch {
    // Storage blocked: the calendar itself still works.
  }
}

/** `off`: nobody picked under "I am" (or the service is off). `syncing`: looking up or saving. `error`: unreachable, retried later. */
export type DatabaseStatus = 'off' | 'syncing' | 'synced' | 'error'

export type CalendarController = {
  /** Every marked day, oldest first. */
  entries: CalendarEntry[]
  /** True once the calendar is mirrored to `calendar.json` in the linked folder. */
  savedToFile: boolean
  /** Whether the calendar is also kept in the database for the person picked under "I am". */
  database: DatabaseStatus
  /** Write `calendar.json` and the database now (when a folder is linked and was read, or a person is picked). */
  saveNow: () => Promise<void>
  /** Mark these dates, replacing whatever they held. `note` only applies to `other`. */
  setDays: (dates: string[], kind: LeaveKind, note: string) => void
  /** Unmark these dates. */
  clearDays: (dates: string[]) => void
}

/**
 * The calendar's marked days. Kept in localStorage like the other pages and
 * mirrored to `calendar.json` in the linked folder (when one is linked and
 * writable), so it stays on this person's own disk. A file already in that
 * folder wins whenever the folder is linked, reconnected or rescanned; a folder
 * without one gets it created from what is on screen.
 *
 * Once a person is picked under "I am" (`person`) it is also kept in the
 * database, one calendar per person, so it follows them to another computer.
 * What the database holds for that person wins over the file whenever it is
 * looked up (on picking, and when the window comes back); a person with nothing
 * saved yet gets what is on screen — unless those days were last synced for
 * somebody else, in which case they start empty.
 */
export function useCalendar(folder: FolderLink, person: string | null): CalendarController {
  const { dir, epoch } = folder
  const [entries, setEntries] = usePersistentState<CalendarEntry[]>(
    CALENDAR_KEY,
    () => [],
    reviveEntries,
  )
  const [savedToFile, setSavedToFile] = useState(false)
  /** The folder whose file has been read — writes wait for it, so a failed read can't overwrite the file. */
  const loadedFor = useRef<FileSystemDirectoryHandle | null>(null)
  const entriesRef = useRef(entries)
  const personKey = DATABASE_ENABLED && person ? nameKey(person) : null
  /** The person whose database copy has been read — writes wait for it, as with the file. */
  const syncedFor = useRef<string | null>(null)
  /** The days (as JSON) the database is known to hold for `syncedFor`. */
  const lastSent = useRef('')
  const [dbState, setDbState] = useState<{ person: string; status: 'synced' | 'error' } | null>(null)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    loadedFor.current = null
    if (!dir) return
    let cancelled = false
    void readCalendarFile(dir).then(async (fromFile) => {
      if (cancelled || fromFile === null) return
      if (fromFile && syncedFor.current === null) setEntries(fromFile)
      else await writeCalendarFile(dir, entriesRef.current)
      if (cancelled) return
      loadedFor.current = dir
      setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [dir, epoch, setEntries])

  useEffect(() => {
    if (!dir || loadedFor.current !== dir) return
    const timer = window.setTimeout(() => {
      void writeCalendarFile(dir, entries).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dir, entries])

  /** Sends the days on screen to the database when it is out of date. Resolves once it has them, or has failed. */
  const pushNow = useCallback(async () => {
    if (!personKey || syncedFor.current !== personKey || !person) return
    const days = entriesRef.current
    const json = JSON.stringify(days)
    if (json === lastSent.current) return
    try {
      await saveCalendar(SHARED_SHIFT, person, days)
      lastSent.current = json
      setDbState({ person: personKey, status: 'synced' })
    } catch {
      setDbState({ person: personKey, status: 'error' })
    }
  }, [person, personKey])

  /** Looks up this person's calendar when picked, and again whenever the window comes back. */
  useEffect(() => {
    syncedFor.current = null
    if (!personKey || !person) return
    const controller = new AbortController()
    const load = async () => {
      const mine = syncedFor.current === personKey
      try {
        const remote = await fetchCalendar(SHARED_SHIFT, person, controller.signal)
        if (controller.signal.aborted) return
        if (mine) {
          // Looking again after a while: take another computer's changes, but never over days not yet sent.
          if (remote && JSON.stringify(entriesRef.current) === lastSent.current) {
            lastSent.current = JSON.stringify(remote)
            setEntries(remote)
          }
          return
        }
        if (remote) {
          lastSent.current = JSON.stringify(remote)
          setEntries(remote)
        } else if (readOwner() === null || readOwner() === personKey) {
          await saveCalendar(SHARED_SHIFT, person, entriesRef.current)
          lastSent.current = JSON.stringify(entriesRef.current)
        } else {
          lastSent.current = '[]'
          setEntries([])
        }
        if (controller.signal.aborted) return
        writeOwner(person)
        syncedFor.current = personKey
        setDbState({ person: personKey, status: 'synced' })
      } catch {
        if (!controller.signal.aborted) setDbState({ person: personKey, status: 'error' })
      }
    }
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (syncedFor.current === personKey && JSON.stringify(entriesRef.current) !== lastSent.current) void pushNow()
      else void load()
    }
    void load()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [person, personKey, pushNow, setEntries])

  useEffect(() => {
    if (!personKey || syncedFor.current !== personKey) return
    const timer = window.setTimeout(() => void pushNow(), DATABASE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [personKey, entries, pushNow])

  const saveNow = useCallback(async () => {
    if (dir && loadedFor.current === dir) await writeCalendarFile(dir, entriesRef.current)
    await pushNow()
  }, [dir, pushNow])

  const setDays = useCallback(
    (dates: string[], kind: LeaveKind, note: string) =>
      setEntries((prev) => {
        const marked = new Set(dates)
        const text = kind === 'other' ? note.trim().slice(0, NOTE_MAX_LENGTH) : ''
        const next = prev.filter((e) => !marked.has(e.date))
        for (const date of marked) next.push({ date, kind, note: text })
        return sortEntries(next)
      }),
    [setEntries],
  )

  const clearDays = useCallback(
    (dates: string[]) => {
      const cleared = new Set(dates)
      setEntries((prev) => prev.filter((e) => !cleared.has(e.date)))
    },
    [setEntries],
  )

  const database: DatabaseStatus = !personKey
    ? 'off'
    : dbState?.person === personKey
      ? dbState.status
      : 'syncing'

  return { entries, savedToFile: savedToFile && dir !== null, database, saveNow, setDays, clearDays }
}

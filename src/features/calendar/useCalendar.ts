import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { NOTE_MAX_LENGTH, reviveEntries, sortEntries } from './calendarData'
import { readCalendarFile, writeCalendarFile } from './calendarFile'
import type { FolderLink } from '../sync/useFolderLifecycle'
import type { CalendarEntry, LeaveKind } from './types'

const CALENDAR_KEY = storageKey('calendar', 'entries')
const FILE_DEBOUNCE_MS = 600

export type CalendarController = {
  /** Every marked day, oldest first. */
  entries: CalendarEntry[]
  /** True once the calendar is mirrored to `calendar.json` in the linked folder. */
  savedToFile: boolean
  /** Write `calendar.json` now (when a folder is linked and was read). */
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
 */
export function useCalendar(folder: FolderLink): CalendarController {
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

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    loadedFor.current = null
    if (!dir) return
    let cancelled = false
    void readCalendarFile(dir).then(async (fromFile) => {
      if (cancelled || fromFile === null) return
      if (fromFile) setEntries(fromFile)
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

  const saveNow = useCallback(async () => {
    if (dir && loadedFor.current === dir) await writeCalendarFile(dir, entriesRef.current)
  }, [dir])

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

  return { entries, savedToFile: savedToFile && dir !== null, saveNow, setDays, clearDays }
}

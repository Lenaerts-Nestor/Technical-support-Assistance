import { readTextFile, writeFileExact } from '../guides/storage/fsOps'
import { reviveEntries } from './calendarData'
import type { CalendarEntry } from './types'

/** Lives next to `guides.json` in the linked folder. Personal — it is never part of a Links or Snippets export. */
export const CALENDAR_FILENAME = 'calendar.json'

/** Entries on disk: `null` when the read failed, `undefined` when there is no file yet. */
export async function readCalendarFile(
  dir: FileSystemDirectoryHandle,
): Promise<CalendarEntry[] | null | undefined> {
  try {
    const text = await readTextFile(dir, CALENDAR_FILENAME)
    if (text === null) return undefined
    return reviveEntries(JSON.parse(text)) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeCalendarFile(
  dir: FileSystemDirectoryHandle,
  entries: CalendarEntry[],
): Promise<boolean> {
  try {
    await writeFileExact(dir, CALENDAR_FILENAME, JSON.stringify({ entries }, null, 2))
    return true
  } catch {
    return false
  }
}

/** `pto` is paid time off; `other` is any other day away, with a short note. */
export type LeaveKind = 'pto' | 'other'

/** One marked day. A date holds at most one entry. `date` is local `YYYY-MM-DD`. */
export type CalendarEntry = {
  date: string
  kind: LeaveKind
  /** What the day is for — kept for `other` only, empty for `pto`. */
  note: string
}

/** Consecutive working days of the same kind and note, shown as one event. */
export type LeaveRun = {
  start: string
  end: string
  kind: LeaveKind
  note: string
  /** Marked days in the run (weekends skipped inside it are not counted). */
  days: number
}

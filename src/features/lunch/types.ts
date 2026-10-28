/** Lunch shift number. 1 = first, 2 = second. */
export type ShiftNo = 1 | 2

/**
 * One row of the roster. To add a column later (team, skills, notes …) add the
 * field here, give it a default in `newAgent` / `reviveAgents` (roster.ts) and a
 * column in `COLUMNS` (components/rosterColumns.tsx) — nothing else has to change.
 */
export type Agent = {
  id: string
  name: string
  /** Language names, as listed in `LANGUAGES` (config.ts). */
  languages: string[]
  /** Handles chat. Chat agents are split evenly over the two shifts. */
  chat: boolean
  /** Should preferably be placed in Shift 1. */
  earlyShift: boolean
  /** In today. Unavailable agents never count for anything. */
  available: boolean
  /** The shift this agent had at the last saved working day; `null` when unknown. */
  yesterdayShift: ShiftNo | null
}

/** Who sits in which shift, as agent ids. Chat and PTO/OOO are derived from the roster. */
export type Schedule = {
  /** The day this schedule was generated for (`YYYY-MM-DD`). */
  date: string
  shift1: string[]
  shift2: string[]
}

/** A saved day. Names rather than ids, so an entry still reads right after the roster changes. */
export type HistoryEntry = {
  date: string
  shift1: string[]
  shift2: string[]
  chat: string[]
  out: string[]
  /** The language warnings that applied when it was saved. */
  notes: string[]
}

/** Everything the page persists — one snapshot, so a storage backend has one thing to load and save. */
export type LunchData = {
  agents: Agent[]
  history: HistoryEntry[]
  schedule: Schedule | null
  /** The day the "new day" step (yesterday's shifts, availability reset) last ran for. */
  syncedDate: string
  /** The published day the roster was last brought up to date from (see `sharedHistory.ts`); empty when none. */
  sharedKey?: string
}

/** A language problem in a schedule. */
export type LanguageWarning = {
  /** `uncovered`: 2+ speakers but a shift has none. `single`: one speaker, no backup. `none`: nobody today. */
  kind: 'uncovered' | 'single' | 'none'
  language: string
  /** The shift missing the language (`uncovered` only). */
  shift?: ShiftNo
  message: string
}

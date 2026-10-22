/**
 * Things you are likely to tune. Everything else in the Lunch Planner reads them
 * from here, so adding a language or changing the history window is a one-line edit.
 */

/** The languages an agent can be tagged with. Add one here and it appears everywhere. */
export const LANGUAGES: { name: string; code: string }[] = [
  { name: 'Dutch', code: 'NL' },
  { name: 'French', code: 'FR' },
  { name: 'German', code: 'DE' },
  { name: 'Italian', code: 'IT' },
  { name: 'Spanish', code: 'ES' },
  { name: 'English', code: 'EN' },
]

/** How many days the history view shows (and keeps when saving). */
export const HISTORY_DAYS = 30

export const SHIFT_LABELS = { 1: 'Shift 1', 2: 'Shift 2' } as const

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
]

/**
 * Spoken by everyone on the team, so it is never tracked or scheduled for. Old saved
 * data and imports that still carry it have it removed on the way in.
 */
const ASSUMED_LANGUAGES = ['english', 'en']
export const isAssumedLanguage = (name: string) => ASSUMED_LANGUAGES.includes(name.trim().toLowerCase())

/** How many days the history view shows (and keeps when saving). */
export const HISTORY_DAYS = 30

export const SHIFT_LABELS = { 1: 'Shift 1', 2: 'Shift 2' } as const

/**
 * The shared lunch shift (see supabase/lunch_shift.sql). Everything is switched off
 * while `key` is empty: no "I am" list, no banner, no requests.
 */
export const SHARED_SHIFT = {
  /** The Supabase project's address. Not a secret. */
  url: 'https://hdvvmuiinsvljinkeckv.supabase.co',
  /**
   * The project's *publishable* (anon) key, from Supabase -> Project Settings -> API Keys.
   * It is meant to be public: what it may do is decided by the policies in lunch_shift.sql.
   * Never put the secret / service_role key here.
   */
  key: '',
}

/** Who may share the shifts when pressing Copy for Teams. Keep in step with publish_lunch_shift() in supabase/lunch_shift.sql. */
export const PUBLISHERS = ['Kevin C', 'Nestor']

/** How often the sidebar looks for a new schedule. */
export const POLL_MS = 30_000

import type { RosterStatus } from './rosterApi'

/** What an empty list of agents says on a phone, where agents are not added: they arrive from the shared roster. */
export function phoneEmptyText(status: RosterStatus, serviceOn: boolean): string {
  if (!serviceOn) return 'No agents on this phone yet.'
  switch (status) {
    case 'off':
      return 'No agents yet. Choose Kevin C or Nestor under “I am” above and the shared roster loads here.'
    case 'syncing':
      return 'Loading the shared roster…'
    case 'offline':
      return 'The shared roster cannot be reached right now. Check the connection; it loads here as soon as it is back.'
    case 'setup':
      return 'The shared roster is not set up yet. Run supabase/lunch_roster.sql once in Supabase, then it loads here.'
    case 'denied':
      return 'This name may not use the shared roster. Choose Kevin C or Nestor under “I am” above.'
    case 'synced':
      return 'The shared roster is empty. Add agents on a computer and they appear here.'
  }
}

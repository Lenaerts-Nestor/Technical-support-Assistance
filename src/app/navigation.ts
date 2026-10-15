import { createContext } from 'react'

export type PageId = 'voiceCall' | 'rma' | 'cases' | 'guides' | 'links' | 'calendar' | 'sync' | 'kevinGuide'

/**
 * `hidden` pages stay mounted and reachable in code but get no sidebar entry.
 * `placement: 'bottom'` pins an entry to the foot of the sidebar, apart from the
 * working pages.
 */
export const NAV_ITEMS: { id: PageId; label: string; hidden?: boolean; placement?: 'bottom' }[] = [
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
  { id: 'links', label: 'Links' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sync', label: 'Sync', placement: 'bottom' },
  { id: 'kevinGuide', label: 'Guide for Kevin', hidden: true },
]

/** Lets a page send the user to another page (a banner's "Open Sync"). Inert by default. */
export const NavigationContext = createContext<(page: PageId) => void>(() => {})

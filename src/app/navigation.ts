import { createContext } from 'react'

export type PageId = 'dashboard' | 'voiceCall' | 'rma' | 'cases' | 'guides' | 'links' | 'nvx' | 'terminal' | 'calendar' | 'lunch' | 'game' | 'sync'

/**
 * `hidden` pages stay mounted and reachable in code but get no sidebar entry.
 * `placement: 'bottom'` pins an entry to the foot of the sidebar, apart from the
 * working pages. `desktopOnly` entries are left out of the sidebar on the website.
 */
export const NAV_ITEMS: { id: PageId; label: string; hidden?: boolean; desktopOnly?: boolean; placement?: 'bottom' }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
  { id: 'links', label: 'Links' },
  { id: 'nvx', label: 'Device API', desktopOnly: true },
  { id: 'terminal', label: 'Terminal', desktopOnly: true },
  { id: 'calendar', label: 'Calendar' },
  { id: 'lunch', label: 'Lunch Planner' },
  { id: 'game', label: 'Game' },
  { id: 'sync', label: 'Sync', placement: 'bottom' },
]

/** Lets a page send the user to another page (a banner's "Open Sync"). Inert by default. */
export const NavigationContext = createContext<(page: PageId) => void>(() => {})

/** True in the desktop app (its preload script sets `window.desktop`), false on the website. */
export const isDesktopApp = (): boolean => typeof window !== 'undefined' && window.desktop?.isDesktop === true

/** Whether a page has a sidebar entry here: not hidden, and not desktop-only when on the website. */
export const isPageAvailable = (id: PageId, desktop: boolean = isDesktopApp()): boolean =>
  NAV_ITEMS.some((item) => item.id === id && !item.hidden && (desktop || !item.desktopOnly))

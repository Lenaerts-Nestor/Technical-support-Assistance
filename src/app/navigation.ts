import { createContext } from 'react'

export type PageId = 'dashboard' | 'voiceCall' | 'rma' | 'cases' | 'guides' | 'links' | 'nvx' | 'terminal' | 'calendar' | 'lunch' | 'game' | 'sync'

/**
 * `hidden` pages stay mounted and reachable in code but get no sidebar entry.
 * `placement: 'bottom'` pins an entry to the foot of the sidebar, apart from the
 * working pages. `desktopOnly` entries are left out of the sidebar on the website.
 * `publishersOnly` entries are shown only to the people who may share the lunch
 * shifts ("I am" is Nestor or Kevin C, see `PUBLISHERS` in features/shift/config.ts).
 */
export type NavItem = {
  id: PageId
  label: string
  hidden?: boolean
  desktopOnly?: boolean
  publishersOnly?: boolean
  placement?: 'bottom'
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
  { id: 'links', label: 'Links' },
  { id: 'nvx', label: 'Device API', desktopOnly: true },
  { id: 'terminal', label: 'Terminal', desktopOnly: true },
  { id: 'calendar', label: 'Calendar' },
  { id: 'lunch', label: 'Lunch Planner', publishersOnly: true },
  { id: 'game', label: 'Break room' },
  { id: 'sync', label: 'Sync', placement: 'bottom' },
]

/** Lets a page send the user to another page (a banner's "Open Sync"). Inert by default. */
export const NavigationContext = createContext<(page: PageId) => void>(() => {})

/** True in the desktop app (its preload script sets `window.desktop`), false on the website. */
export const isDesktopApp = (): boolean => typeof window !== 'undefined' && window.desktop?.isDesktop === true

/** Who is looking: which build, and whether they are one of the people who plan lunch. */
export type NavAudience = { desktop: boolean; publisher: boolean }

/** Whether a sidebar entry is shown to this audience. */
export const isNavItemVisible = (item: NavItem, { desktop, publisher }: NavAudience): boolean =>
  !item.hidden && (desktop || !item.desktopOnly) && (publisher || !item.publishersOnly)

/**
 * Whether a page has a sidebar entry for this audience. Without an audience it is judged for the
 * current build with the publisher-only pages counted in, so a saved page is not dropped before the
 * app knows who "I am" is; the shell checks again once it does.
 */
export const isPageAvailable = (
  id: PageId,
  audience: NavAudience = { desktop: isDesktopApp(), publisher: true },
): boolean => NAV_ITEMS.some((item) => item.id === id && isNavItemVisible(item, audience))

/**
 * Where to send the user when the page they are on is not theirs, or `null` to stay. On a phone the
 * sidebar is gone and the Lunch Planner is the only page, so it is never left (the planner carries its
 * own "I am" picker there) and anything else leads back to it. Elsewhere a page that is not available to
 * this audience (the planner once "I am" is not Kevin C or Nestor) leads back to the Dashboard.
 */
export function redirectFor(page: PageId, { phone, ...audience }: NavAudience & { phone: boolean }): PageId | null {
  if (phone) return page === 'lunch' ? null : 'lunch'
  return isPageAvailable(page, audience) ? null : 'dashboard'
}

/**
 * The page the app opens on. The desktop app always opens on the Dashboard. On a phone (the website, with
 * no sidebar) it opens straight on the Lunch Planner, which is what a team lead there came for. Elsewhere
 * the website returns to the page the user was last on, or the Dashboard when that is gone or never set.
 */
export function landingPage({ desktop, phone, saved }: { desktop: boolean; phone: boolean; saved: PageId | null }): PageId {
  if (desktop) return 'dashboard'
  if (phone) return 'lunch'
  return saved !== null && isPageAvailable(saved, { desktop, publisher: true }) ? saved : 'dashboard'
}

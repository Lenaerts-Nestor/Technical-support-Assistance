import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { AppDataProvider } from './AppDataProvider'
import { SharedShiftProvider } from '../features/shift/SharedShiftProvider'
import { useSharedShift } from '../features/shift/sharedShiftContext'
import { FocusModeContext } from './focusMode'
import { NAV_ITEMS, NavigationContext, isDesktopApp, landingPage, redirectFor } from './navigation'
import { storageKey, usePersistentState } from '../shared/storage/usePersistentState'
import { PHONE_QUERY, matchesMedia, useIsPhone } from '../shared/hooks/useMediaQuery'
import type { PageId } from './navigation'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { VoiceCallPage } from '../features/voiceCall/VoiceCallPage'
import { RmaPage } from '../features/rma/RmaPage'
import { CasesPage } from '../features/cases/CasesPage'
import { GuidesPage } from '../features/guides/GuidesPage'
import { LinksPage } from '../features/links/LinksPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { NvxPage } from '../features/nvx/NvxPage'
import { TerminalPage } from '../features/terminal/TerminalPage'
import { LunchPlannerPage } from '../features/lunch/LunchPlannerPage'
import { GamePage } from '../features/game/GamePage'
import { SyncPage } from '../features/sync/SyncPage'

const PAGES: Record<PageId, () => React.ReactElement> = {
  dashboard: DashboardPage,
  voiceCall: VoiceCallPage,
  rma: RmaPage,
  cases: CasesPage,
  guides: GuidesPage,
  links: LinksPage,
  nvx: NvxPage,
  terminal: TerminalPage,
  calendar: CalendarPage,
  lunch: LunchPlannerPage,
  game: GamePage,
  sync: SyncPage,
}

const LAST_PAGE_KEY = storageKey('app', 'lastPage')

/**
 * Sends the user away from a page that has stopped being theirs: back to the Dashboard when the Lunch
 * Planner is left behind by "I am" changing to someone who does not plan lunch, and to the Lunch Planner
 * on a phone, where it is the only page (see `redirectFor`). Renders nothing; it sits inside the shift
 * provider because that is where "I am" lives.
 */
function PageGuard({ page, onRedirect }: { page: PageId; onRedirect: (to: PageId) => void }) {
  const { canPublish } = useSharedShift()
  const phone = useIsPhone()
  const target = redirectFor(page, { desktop: isDesktopApp(), publisher: canPublish, phone })
  useEffect(() => {
    if (target) onRedirect(target)
  }, [target, onRedirect])
  return null
}

/**
 * The desktop app always opens on the Dashboard and a phone on the Lunch Planner. The website otherwise
 * returns to the page the user was last on (so a refresh keeps their place); a first visit, or a page
 * that is no longer available, lands on the Dashboard.
 */
function initialPage(): PageId {
  let saved: PageId | null = null
  try {
    const raw = window.localStorage.getItem(LAST_PAGE_KEY)
    saved = raw === null ? null : (JSON.parse(raw) as PageId)
  } catch {
    // Storage blocked or unreadable: start on the default page.
  }
  return landingPage({ desktop: isDesktopApp(), phone: matchesMedia(PHONE_QUERY), saved })
}

export default function App() {
  const [page, setPageState] = useState<PageId>(initialPage)
  const setPage = useCallback((id: PageId) => {
    setPageState(id)
    if (isDesktopApp()) return
    try {
      window.localStorage.setItem(LAST_PAGE_KEY, JSON.stringify(id))
    } catch {
      // Storage blocked: the page still changes, it just is not remembered.
    }
  }, [])
  // The user's own choice: shrink the sidebar to icons. Remembered across reloads.
  const [collapsed, setCollapsed] = usePersistentState<boolean>(
    storageKey('app', 'sidebarCollapsed'),
    () => false,
    (raw) => (typeof raw === 'boolean' ? raw : null),
  )
  // A page can ask for room (see focusMode.ts); only the visible page gets it.
  const [focused, setFocused] = useState<ReadonlySet<PageId>>(() => new Set())
  const setFocus = useCallback((id: PageId, on: boolean) => {
    setFocused((prev) => {
      if (prev.has(id) === on) return prev
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const forced = focused.has(page)

  return (
    <ErrorBoundary>
      {/*
        Folder, guides, links and snippets live above every page so the Sync page can reach them. The shared
        shift sits above them because the calendar is kept in the database for whoever is picked under "I am".
      */}
      <SharedShiftProvider>
        <AppDataProvider>
          <NavigationContext.Provider value={setPage}>
            <div className="bg-canvas text-ink flex h-full">
              <PageGuard page={page} onRedirect={setPage} />
              <Sidebar
                current={page}
                onNavigate={setPage}
                compact={collapsed || forced}
                lockedCompact={forced}
                onToggle={() => setCollapsed((c) => !c)}
              />
              {/*
                Every page stays mounted and the inactive ones are hidden, so stepping
                away from a half-filled form mid-call and coming back keeps it. Each
                page owns its scrollport (rather than one shared one on <main>), which
                also keeps each page's scroll position and lets a sticky header pin
                flush to the top of its own page. `relative` makes the scrollport the
                containing block for absolutely positioned children (`sr-only` text):
                without it they escape the scrollport and stretch the whole window's
                scroll height, so the app itself scrolls past the sidebar.
              */}
              <main className="flex-1 overflow-hidden">
                {NAV_ITEMS.map(({ id }) => {
                  const Page = PAGES[id]
                  return (
                    <div key={id} hidden={id !== page} className="relative h-full overflow-y-auto">
                      <ErrorBoundary>
                        <FocusModeContext.Provider value={setFocus}>
                          <Page />
                        </FocusModeContext.Provider>
                      </ErrorBoundary>
                    </div>
                  )
                })}
              </main>
            </div>
          </NavigationContext.Provider>
        </AppDataProvider>
      </SharedShiftProvider>
    </ErrorBoundary>
  )
}

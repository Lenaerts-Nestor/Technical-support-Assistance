import { useCallback, useState } from 'react'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { AppDataProvider } from './AppDataProvider'
import { FocusModeContext } from './focusMode'
import { NAV_ITEMS, NavigationContext } from './navigation'
import { storageKey, usePersistentState } from '../shared/storage/usePersistentState'
import type { PageId } from './navigation'
import { VoiceCallPage } from '../features/voiceCall/VoiceCallPage'
import { RmaPage } from '../features/rma/RmaPage'
import { CasesPage } from '../features/cases/CasesPage'
import { GuidesPage } from '../features/guides/GuidesPage'
import { LinksPage } from '../features/links/LinksPage'
import { SyncPage } from '../features/sync/SyncPage'
import { KevinGuidePage } from '../features/kevinGuide/KevinGuidePage'

const PAGES: Record<PageId, () => React.ReactElement> = {
  voiceCall: VoiceCallPage,
  rma: RmaPage,
  cases: CasesPage,
  guides: GuidesPage,
  links: LinksPage,
  sync: SyncPage,
  kevinGuide: KevinGuidePage,
}

export default function App() {
  const [page, setPage] = useState<PageId>('voiceCall')
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
      {/* Folder, guides, links and snippets live above every page so the Sync page can reach them. */}
      <AppDataProvider>
        <NavigationContext.Provider value={setPage}>
          <div className="bg-canvas text-ink flex h-full">
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
              flush to the top of its own page.
            */}
            <main className="flex-1 overflow-hidden">
              {NAV_ITEMS.map(({ id }) => {
                const Page = PAGES[id]
                return (
                  <div key={id} hidden={id !== page} className="h-full overflow-y-auto">
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
    </ErrorBoundary>
  )
}

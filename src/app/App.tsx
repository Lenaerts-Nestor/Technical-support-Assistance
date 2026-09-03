import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { NAV_ITEMS } from './navigation'
import type { PageId } from './navigation'
import { VoiceCallPage } from '../features/voiceCall/VoiceCallPage'
import { RmaPage } from '../features/rma/RmaPage'
import { CasesPage } from '../features/cases/CasesPage'
import { GuidesPage } from '../features/guides/GuidesPage'

const PAGES: Record<PageId, () => React.ReactElement> = {
  voiceCall: VoiceCallPage,
  rma: RmaPage,
  cases: CasesPage,
  guides: GuidesPage,
}

export default function App() {
  const [page, setPage] = useState<PageId>('voiceCall')

  return (
    <div className="bg-canvas text-ink flex h-full">
      <Sidebar current={page} onNavigate={setPage} />
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
                <Page />
              </ErrorBoundary>
            </div>
          )
        })}
      </main>
    </div>
  )
}

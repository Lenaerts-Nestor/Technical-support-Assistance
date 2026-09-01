import { useState } from 'react'
import { Sidebar } from './Sidebar'
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
  const Page = PAGES[page]

  return (
    <div className="bg-canvas text-ink flex h-full">
      <Sidebar current={page} onNavigate={setPage} />
      {/* No padding here: pages own their own insets so a page with a sticky
          header can pin it flush to the top of the scrollport. */}
      <main className="flex-1 overflow-y-auto">
        <Page />
      </main>
    </div>
  )
}

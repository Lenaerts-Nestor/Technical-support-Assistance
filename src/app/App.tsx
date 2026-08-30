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
    <div className="flex h-full bg-white text-slate-900">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-8">
        <Page />
      </main>
    </div>
  )
}

import type { ReactNode } from 'react'
import { useGuides } from './useGuides'
import { GuidesHeader } from './components/GuidesHeader'
import { GuideGroup } from './components/GuideGroup'
import { SyncPanel } from './components/SyncPanel'
import { GuideAssetsProvider } from './view/GuideAssetsContext'
import { GuideView } from './view/GuideView'
import { GuideEditor } from './edit/GuideEditor'

export function GuidesPage() {
  const guides = useGuides()
  const isEmpty = guides.guides.length === 0

  let screen: ReactNode
  if (guides.screen.name === 'view' && guides.activeGuide) {
    const active = guides.activeGuide
    screen = (
      <GuideView
        guide={active}
        onBack={guides.closeGuide}
        onEdit={() => guides.editGuide(active.id)}
        onDelete={() => guides.deleteGuide(active.id)}
      />
    )
  } else if (guides.screen.name === 'edit' && guides.activeGuide) {
    screen = (
      <GuideEditor
        key={guides.activeGuide.id}
        guide={guides.activeGuide}
        onSave={guides.saveGuide}
        onCancel={guides.cancelEdit}
      />
    )
  } else {
    screen = (
      <div className="mx-auto max-w-[1600px] space-y-6">
        <GuidesHeader onNewGuide={guides.newGuide} />

        <div className="grid grid-cols-[1fr_320px] items-start gap-6">
          <div className="space-y-8">
            {isEmpty ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400">
                No guides loaded yet. Link a folder in the Sync panel, use{' '}
                <span className="font-medium text-slate-500">Append</span> to load
                a guides JSON, or start one with{' '}
                <span className="font-medium text-slate-500">New Guide</span>.
              </p>
            ) : (
              <>
                {guides.pinnedGuides.length > 0 && (
                  <GuideGroup
                    title="Pinned"
                    sideLabel="Highlighted guides"
                    guides={guides.pinnedGuides}
                    onOpen={guides.openGuide}
                    onTogglePin={guides.togglePin}
                    onMove={guides.moveGuide}
                  />
                )}
                <GuideGroup
                  title="All guides"
                  sideLabel="Standard list"
                  guides={guides.unpinnedGuides}
                  onOpen={guides.openGuide}
                  onTogglePin={guides.togglePin}
                  onMove={guides.moveGuide}
                />
              </>
            )}
          </div>

          <SyncPanel
            folder={guides.folder}
            onImport={guides.importGuides}
            onExport={guides.exportGuides}
            onTemplate={guides.downloadTemplate}
            error={guides.error}
          />
        </div>
      </div>
    )
  }

  return (
    <GuideAssetsProvider value={guides.folder.assets}>
      {screen}
    </GuideAssetsProvider>
  )
}

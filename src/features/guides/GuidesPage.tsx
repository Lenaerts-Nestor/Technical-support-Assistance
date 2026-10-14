import { useContext } from 'react'
import type { ReactNode } from 'react'
import { useFolder, useGuidesData, useReportEditingGuide } from '../../app/appDataContext'
import { NavigationContext } from '../../app/navigation'
import { EMPTY } from '../../shared/ui/styles'
import { useGuideAssets } from './useGuideAssets'
import { useGuidesScreen } from './useGuidesScreen'
import { GuidesHeader } from './components/GuidesHeader'
import { GuideGroup } from './components/GuideGroup'
import { FolderStatusStrip } from './components/FolderStatusStrip'
import { GuideAssetsProvider } from './view/GuideAssetsContext'
import { GuideView } from './view/GuideView'
import { GuideEditor } from './edit/GuideEditor'

export function GuidesPage() {
  const library = useGuidesData()
  const folder = useFolder()
  const goTo = useContext(NavigationContext)
  const page = useGuidesScreen(library)
  const isEmpty = library.guides.length === 0
  const active = page.activeGuide
  const assets = useGuideAssets(active, library.assetIo)

  useReportEditingGuide(page.screen.name === 'edit' && !!active)

  let screen: ReactNode
  if (page.screen.name === 'view' && active) {
    screen = (
      <GuideView
        guide={active}
        onBack={page.closeGuide}
        onEdit={() => page.editGuide(active.id)}
        onDelete={() => void page.deleteGuide(active.id)}
      />
    )
  } else if (page.screen.name === 'edit' && active) {
    screen = (
      <GuideEditor
        key={active.id}
        guide={active}
        onSave={page.saveGuide}
        onCancel={page.cancelEdit}
      />
    )
  } else {
    screen = (
      <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
        <GuidesHeader onNewGuide={page.newGuide} />

        <div className="space-y-7">
          {isEmpty ? (
            <p className={EMPTY}>
              {folder.supported && folder.status === 'idle'
                ? 'No guides loaded yet. '
                : 'No guides yet. '}
              Link a folder or import guides on the{' '}
              <button
                type="button"
                onClick={() => goTo('sync')}
                className="text-brand-strong font-semibold underline-offset-2 hover:underline"
              >
                Sync page
              </button>
              , or start with <span className="text-ink font-semibold">New Guide</span>.
            </p>
          ) : (
            <>
              {library.pinnedGuides.length > 0 && (
                <GuideGroup
                  title="Pinned"
                  sideLabel="Highlighted guides"
                  guides={library.pinnedGuides}
                  onOpen={page.openGuide}
                  onTogglePin={library.togglePin}
                  onMove={library.moveGuide}
                />
              )}
              <GuideGroup
                title="All guides"
                sideLabel="Standard list"
                guides={library.unpinnedGuides}
                onOpen={page.openGuide}
                onTogglePin={library.togglePin}
                onMove={library.moveGuide}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <GuideAssetsProvider value={assets}>
      {page.screen.name !== 'edit' && <FolderStatusStrip />}
      {screen}
    </GuideAssetsProvider>
  )
}

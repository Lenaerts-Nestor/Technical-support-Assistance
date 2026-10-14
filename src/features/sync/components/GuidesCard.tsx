import { useState } from 'react'
import { useGuidesData, useIsEditingGuide } from '../../../app/appDataContext'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import type { ConflictMode } from '../../guides/guidesMerge'
import type { Guide } from '../../guides/types'
import { readGuidesJsonFile } from '../packages'
import { plural } from '../format'
import { useNotice } from '../useNotice'
import { BookIcon, DownloadIcon, UploadIcon } from './icons'
import { FileButton } from './FileButton'
import { ImportDialog } from './ImportDialog'
import { PackageCard } from './PackageCard'

type Found = { name: string; guides: Guide[]; clashes: number }

/** Export / import guides on their own. */
export function GuidesCard() {
  const library = useGuidesData()
  const editing = useIsEditingGuide()
  const [notice, setNotice] = useNotice()
  const [found, setFound] = useState<Found | null>(null)

  const pick = async (file: File) => {
    try {
      const guides = await readGuidesJsonFile(file)
      const clashes = guides.filter((g) => library.guides.some((l) => l.id === g.id)).length
      setNotice(null)
      setFound({ name: file.name, guides, clashes })
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'That file could not be read.' })
    }
  }

  const confirm = (mode: ConflictMode) => {
    if (!found) return
    const r = library.importGuides(found.guides, mode)
    setFound(null)
    const parts = [
      r.added && `${plural(r.added, 'guide')} added`,
      r.replaced && `${plural(r.replaced, 'guide')} replaced`,
      r.copied && `${plural(r.copied, 'copy', 'copies')} added`,
      r.skipped && `${plural(r.skipped, 'guide')} skipped`,
    ].filter(Boolean)
    setNotice({ tone: 'ok', text: `${parts.join(', ') || 'Nothing changed'}.` })
  }

  return (
    <>
      <PackageCard
        icon={<BookIcon className="h-4 w-4" />}
        title="Guides"
        description="The step-by-step guides. Guides are exchanged as a guides JSON (the text of the steps); screenshots and project files stay in the linked folder."
        format="A guides JSON. Importing adds guides by id — your own guides are never removed."
        notice={notice}
        blocked={editing ? 'Save or cancel the guide you are editing first.' : null}
      >
        <button
          type="button"
          disabled={library.guides.length === 0}
          onClick={library.exportGuidesJson}
          className={GHOST_BTN_MD}
        >
          <DownloadIcon className="h-4 w-4" />
          Export guides JSON
        </button>
        <FileButton accept=".json,application/json" disabled={editing} onFile={(f) => void pick(f)}>
          <UploadIcon className="h-4 w-4" />
          Import guides JSON…
        </FileButton>
        <button type="button" onClick={library.downloadTemplate} className={GHOST_BTN_MD}>
          Template
        </button>
      </PackageCard>

      {found && (
        <ImportDialog<ConflictMode>
          title="Import guides"
          summary={
            <>
              <strong className="text-ink">{found.name}</strong> holds {plural(found.guides.length, 'guide')}
              {found.clashes > 0
                ? `; ${found.clashes} of them ${found.clashes === 1 ? 'is' : 'are'} already in your library.`
                : ' — none are in your library yet.'}
            </>
          }
          modes={
            found.clashes > 0
              ? [
                  {
                    id: 'keep-both',
                    label: 'Keep both',
                    description: 'Adds the file’s version as a copy titled “… (imported)”.',
                  },
                  {
                    id: 'replace',
                    label: 'Replace the ones I have',
                    description: 'Uses the file’s content; your pin and position are kept.',
                  },
                  {
                    id: 'skip',
                    label: 'Skip the ones I have',
                    description: 'Only adds the guides that are new.',
                  },
                ]
              : []
          }
          confirmLabel="Import"
          onConfirm={(mode) => confirm(found.clashes > 0 ? mode : 'skip')}
          onCancel={() => setFound(null)}
        />
      )}
    </>
  )
}

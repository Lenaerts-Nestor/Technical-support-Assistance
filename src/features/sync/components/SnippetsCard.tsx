import { useState } from 'react'
import { useSnippetsData } from '../../../app/appDataContext'
import { downloadBlob } from '../../guides/storage/folderZip'
import { buildZip } from '../../guides/storage/zipWriter'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import type { Snippet } from '../../cases/types'
import { datestamp, readSnippetsPackage, snippetsPackage } from '../packages'
import { plural } from '../format'
import { useNotice } from '../useNotice'
import { DownloadIcon, TextsIcon, UploadIcon } from './icons'
import { FileButton } from './FileButton'
import { ImportDialog } from './ImportDialog'
import { PackageCard } from './PackageCard'

type Found = { name: string; snippets: Snippet[] }

/** Export / import "My texts" from the Cases page on their own — a .zip holding `cases-snippets.json`. */
export function SnippetsCard() {
  const { snippets, importSnippets } = useSnippetsData()
  const [notice, setNotice] = useNotice()
  const [found, setFound] = useState<Found | null>(null)

  const exportSnippets = async () => {
    try {
      downloadBlob(await buildZip(snippetsPackage(snippets)), `case-snippets-${datestamp()}.zip`)
      setNotice({ tone: 'ok', text: `Exported ${plural(snippets.length, 'text')} to case-snippets-${datestamp()}.zip.` })
    } catch {
      setNotice({ tone: 'error', text: 'Could not build the zip.' })
    }
  }

  const pick = async (file: File) => {
    try {
      const list = await readSnippetsPackage(file)
      if (list.length === 0) {
        setNotice({ tone: 'error', text: `${file.name} has no texts in it.` })
        return
      }
      setNotice(null)
      setFound({ name: file.name, snippets: list })
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'That file could not be read.' })
    }
  }

  const confirm = (mode: 'merge' | 'replace') => {
    if (!found) return
    const result = importSnippets(found.snippets, mode)
    setFound(null)
    setNotice({
      tone: 'ok',
      text:
        mode === 'replace'
          ? `Replaced your texts with ${plural(result.added, 'text')} from the file.`
          : `Added ${plural(result.added, 'text')}${
              result.renamed ? ` (${result.renamed} renamed because the name was taken)` : ''
            }; ${result.skipped} already there.`,
    })
  }

  return (
    <>
      <PackageCard
        icon={<TextsIcon className="h-4 w-4" />}
        title="Case snippets"
        description="Your own ready-made texts for case notes (“My texts” on the Cases page), in every language."
        format="A .zip containing cases-snippets.json (a bare cases-snippets.json also works)."
        notice={notice}
      >
        <button type="button" onClick={() => void exportSnippets()} className={GHOST_BTN_MD}>
          <DownloadIcon className="h-4 w-4" />
          Export snippets
        </button>
        <FileButton accept=".zip,.json,application/zip,application/json" onFile={(f) => void pick(f)}>
          <UploadIcon className="h-4 w-4" />
          Import snippets…
        </FileButton>
      </PackageCard>

      {found && (
        <ImportDialog<'merge' | 'replace'>
          title="Import case snippets"
          summary={
            <>
              <strong className="text-ink">{found.name}</strong> holds {plural(found.snippets.length, 'text')}. You
              currently have {plural(snippets.length, 'text')}.
            </>
          }
          modes={[
            {
              id: 'merge',
              label: 'Add what’s missing',
              description:
                'Texts you already have (same language and wording) are skipped. A different text with a name that is taken is added as “Name (2)”.',
            },
            {
              id: 'replace',
              label: 'Replace everything',
              description: `Removes your ${plural(snippets.length, 'text')} and uses the file’s instead.`,
            },
          ]}
          confirmLabel="Import"
          onConfirm={confirm}
          onCancel={() => setFound(null)}
        />
      )}
    </>
  )
}

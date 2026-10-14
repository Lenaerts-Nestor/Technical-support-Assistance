import { useState } from 'react'
import { useLinksData } from '../../../app/appDataContext'
import { downloadBlob } from '../../guides/storage/folderZip'
import { buildZip } from '../../guides/storage/zipWriter'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import { countLinks } from '../../links/linksMerge'
import type { LinkSection } from '../../links/types'
import { datestamp, linksPackage, readLinksPackage } from '../packages'
import { plural } from '../format'
import { useNotice } from '../useNotice'
import { DownloadIcon, LinksIcon, UploadIcon } from './icons'
import { FileButton } from './FileButton'
import { ImportDialog } from './ImportDialog'
import { PackageCard } from './PackageCard'

type Found = { name: string; sections: LinkSection[] }

/** Export / import the Links page on its own — a .zip holding `links.json`. */
export function LinksCard() {
  const links = useLinksData()
  const [notice, setNotice] = useNotice()
  const [found, setFound] = useState<Found | null>(null)
  const current = countLinks(links.sections)

  const exportLinks = async () => {
    try {
      downloadBlob(await buildZip(linksPackage(links.sections)), `links-${datestamp()}.zip`)
      setNotice({ tone: 'ok', text: `Exported ${plural(current, 'link')} to links-${datestamp()}.zip.` })
    } catch {
      setNotice({ tone: 'error', text: 'Could not build the zip.' })
    }
  }

  const pick = async (file: File) => {
    try {
      const sections = await readLinksPackage(file)
      if (countLinks(sections) === 0) {
        setNotice({ tone: 'error', text: `${file.name} has no links in it.` })
        return
      }
      setNotice(null)
      setFound({ name: file.name, sections })
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'That file could not be read.' })
    }
  }

  const confirm = (mode: 'merge' | 'replace') => {
    if (!found) return
    const result = links.importSections(found.sections, mode)
    setFound(null)
    setNotice({
      tone: 'ok',
      text:
        mode === 'replace'
          ? `Replaced your links with ${plural(result.added.links, 'link')} from the file.`
          : `Added ${plural(result.added.links, 'link')}${
              result.added.sections ? ` in ${plural(result.added.sections, 'new section')}` : ''
            }; ${result.skipped} already there.`,
    })
  }

  const incoming = found ? countLinks(found.sections) : 0

  return (
    <>
      <PackageCard
        icon={<LinksIcon className="h-4 w-4" />}
        title="Links"
        description="The quick links on the Links page — sections, folders and every address. Move them to a coworker without touching anything else."
        format="A .zip containing links.json (a bare links.json also works)."
        notice={notice}
      >
        <button type="button" onClick={() => void exportLinks()} className={GHOST_BTN_MD}>
          <DownloadIcon className="h-4 w-4" />
          Export links
        </button>
        <FileButton accept=".zip,.json,application/zip,application/json" onFile={(f) => void pick(f)}>
          <UploadIcon className="h-4 w-4" />
          Import links…
        </FileButton>
      </PackageCard>

      {found && (
        <ImportDialog<'merge' | 'replace'>
          title="Import links"
          summary={
            <>
              <strong className="text-ink">{found.name}</strong> holds {plural(incoming, 'link')} in{' '}
              {plural(found.sections.length, 'section')}. You currently have {plural(current, 'link')}.
            </>
          }
          modes={[
            {
              id: 'merge',
              label: 'Add what’s missing',
              description: 'Links already there (same address) are skipped. Nothing of yours is removed.',
            },
            {
              id: 'replace',
              label: 'Replace everything',
              description: `Removes your ${plural(current, 'link')} and uses the file’s instead.`,
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

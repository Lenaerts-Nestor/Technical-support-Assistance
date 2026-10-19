import { useState } from 'react'
import { useFolder, useIsEditingGuide } from '../../../app/appDataContext'
import { ZipArchive, ZipError } from '../../guides/storage/zipReader'
import { ZipLimitError } from '../../guides/storage/zipWriter'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import { exportFullBackup } from '../backupExport'
import { classifyArchive, MANIFEST_NAME, wrongCardMessage } from '../packages'
import { describeFolderContent, restoreBackup } from '../restoreBackup'
import type { FolderContent } from '../restoreBackup'
import { useSaveAll } from '../useSaveAll'
import { plural } from '../format'
import { useNotice } from '../useNotice'
import { ArchiveIcon, DownloadIcon, UploadIcon } from './icons'
import { FileButton } from './FileButton'
import { ImportDialog } from './ImportDialog'
import { PackageCard } from './PackageCard'

type Pending = {
  name: string
  archive: ZipArchive
  fileCount: number
  legacy: boolean
  /** What the folder's own data files hold now and the restore will replace, if anything. */
  replaces: string
}

const describeContent = (c: FolderContent) =>
  [c.guides && plural(c.guides, 'guide'), c.links && plural(c.links, 'link'), c.snippets && plural(c.snippets, 'text'), c.calendar && plural(c.calendar, 'calendar day'), c.nvx && plural(c.nvx, 'device API entry', 'device API entries')]
    .filter(Boolean)
    .join(', ')

/** Everything in the linked folder as one zip — and putting such a zip back into an empty folder. */
export function BackupCard() {
  const folder = useFolder()
  const editing = useIsEditingGuide()
  const saveAll = useSaveAll()
  const [notice, setNotice] = useNotice()
  const [pending, setPending] = useState<Pending | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const dir = folder.dir

  const blocked = !folder.supported
    ? 'Backups need Chrome or Edge on desktop and a linked folder.'
    : !dir
      ? 'Link a folder above to make or restore a backup.'
      : editing
        ? 'Save or cancel the guide you are editing first.'
        : folder.busy || progress
          ? 'Working…'
          : null

  const exportBackup = async () => {
    if (!dir) return
    try {
      const files = await exportFullBackup(folder, saveAll)
      setNotice(
        files === 0
          ? { tone: 'error', text: 'The linked folder is empty — nothing to back up.' }
          : { tone: 'ok', text: `Backup downloaded — ${plural(files, 'file')}.` },
      )
    } catch (e) {
      setNotice({
        tone: 'error',
        text: e instanceof ZipLimitError ? e.message : 'Could not read the folder to build the zip.',
      })
    }
  }

  const pick = async (file: File) => {
    if (!dir) return
    try {
      const archive = await ZipArchive.open(file)
      const kind = await classifyArchive(archive)
      if (kind !== 'backup' && kind !== 'legacy-backup') {
        setNotice({ tone: 'error', text: wrongCardMessage(kind, 'a full backup') })
        return
      }
      const content = await describeFolderContent(dir)
      const place = folder.folderName || 'The linked folder'
      if (content.other > 0) {
        setNotice({
          tone: 'error',
          text: `${place} already holds ${plural(content.other, 'other file or folder')} besides the three data files, and a restore would mix with them. Restore into an empty folder, or bring in single parts with the Links, Case snippets and Guides cards.`,
        })
        return
      }
      setNotice(null)
      setPending({
        name: file.name,
        archive,
        fileCount: archive.entries.filter((e) => e.path !== MANIFEST_NAME).length,
        legacy: kind === 'legacy-backup',
        replaces: describeContent(content),
      })
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ZipError ? e.message : 'That file could not be read.' })
    }
  }

  const restore = async () => {
    const job = pending
    if (!job || !dir) return
    setPending(null)
    setProgress('Restoring…')
    try {
      const result = await folder.runExclusive(async () => {
        const r = await restoreBackup(dir, job.archive, (done, total) => setProgress(`Restoring… ${done} of ${total}`))
        folder.rescan()
        return r
      })
      if (result.failed.length > 0) {
        setNotice({
          tone: 'error',
          text: `Restored ${plural(result.written, 'file')}, but ${result.failed.length} could not be written (first: ${result.failed[0].path}).`,
        })
      } else {
        setNotice({
          tone: 'ok',
          text: `Restored ${plural(result.written, 'file')}.${
            job.legacy ? ' This backup uses the older folder layout — the Guides page will offer to organize it.' : ''
          }`,
        })
      }
    } catch {
      setNotice({ tone: 'error', text: 'The restore stopped — the folder may be out of space or no longer available.' })
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <PackageCard
        icon={<ArchiveIcon className="h-4 w-4" />}
        title="Full backup"
        description="Everything in one zip: guides with their screenshots and project files, links and case snippets. Use it to move to a new computer or as a safety copy."
        format="A .zip of the whole linked folder. Restoring writes it into a linked folder that holds no other files yet."
        notice={progress ? { tone: 'ok', text: progress } : notice}
        blocked={blocked}
      >
        <button
          type="button"
          disabled={!!blocked}
          onClick={() => void exportBackup()}
          className={GHOST_BTN_MD}
        >
          <DownloadIcon className="h-4 w-4" />
          Download backup
        </button>
        <FileButton accept=".zip,application/zip" disabled={!!blocked} onFile={(f) => void pick(f)}>
          <UploadIcon className="h-4 w-4" />
          Restore backup…
        </FileButton>
      </PackageCard>

      {pending && (
        <ImportDialog<'restore'>
          title="Restore backup"
          summary={
            <>
              <strong className="text-ink">{pending.name}</strong> holds {plural(pending.fileCount, 'file')}, which
              will be written into {folder.folderName ? `“${folder.folderName}”` : 'the linked folder'}.
              {pending.replaces ? (
                <span className="mt-2 block text-amber-200">
                  The folder’s own data files will be replaced — they currently hold {pending.replaces}. Download a
                  backup first if you may still need them.
                </span>
              ) : (
                ' Nothing in the folder is overwritten.'
              )}
            </>
          }
          confirmLabel="Restore"
          onConfirm={() => void restore()}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}

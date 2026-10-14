import { useState } from 'react'
import { useFolder, useGuidesData, useIsEditingGuide } from '../../../app/appDataContext'
import { Modal } from '../../../shared/ui/Modal'
import { GHOST_BTN, GHOST_BTN_MD, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { findUnindexedGuideFolders } from '../../guides/storage/adoptFolders'
import type { FolderScan } from '../../guides/storage/adoptFolders'
import { readTextFile } from '../../guides/storage/fsOps'
import { GUIDES_FILENAME } from '../../guides/storage/guidesFolder'
import { OrganizeAbort, isShared, planOrganize, runOrganize } from '../../guides/storage/organize'
import type { OrganizePlan, OrganizeResult } from '../../guides/storage/organize'
import { exportFullBackup } from '../backupExport'
import { formatBytes, plural } from '../format'
import { useNotice } from '../useNotice'
import { useSaveAll } from '../useSaveAll'
import { FolderIcon } from './icons'

type Stage =
  | null
  | { kind: 'planning' }
  | { kind: 'plan'; plan: OrganizePlan }
  | { kind: 'running'; done: number; total: number }
  | { kind: 'report'; result: OrganizeResult; plan: OrganizePlan }
  | { kind: 'found'; scan: FolderScan }

const LIST = 'border-line bg-canvas max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs'

/** How the guides sit on disk — one folder each, or still the shared pool — and the tools to fix or refresh that. */
export function FolderStructure() {
  const folder = useFolder()
  const library = useGuidesData()
  const editing = useIsEditingGuide()
  const saveAll = useSaveAll()
  const [notice, setNotice] = useNotice()
  const [stage, setStage] = useState<Stage>(null)
  const [backupNote, setBackupNote] = useState<string | null>(null)
  const dir = folder.dir

  const total = library.guides.length
  const shared = library.guides.filter(isShared).length
  const blocked = !folder.supported
    ? 'Needs Chrome or Edge and a linked folder.'
    : !dir
      ? 'Link a folder to organize it.'
      : editing
        ? 'Save or cancel the guide you are editing first.'
        : folder.busy || stage
          ? 'Working…'
          : null

  const summary =
    total === 0
      ? 'No guides yet — new guides get a folder of their own automatically.'
      : shared === 0
        ? `All ${plural(total, 'guide')} have a folder of their own (guides/<name>/ with its images and project files), so each one can be exported and shared on its own.`
        : `${shared} of ${plural(total, 'guide')} still ${shared === 1 ? 'uses' : 'use'} the shared pool of files at the top of the folder. Organize copies each guide’s files into a folder of its own — nothing is moved or deleted.`

  const startOrganize = async () => {
    if (!dir) return
    setNotice(null)
    setBackupNote(null)
    setStage({ kind: 'planning' })
    try {
      await library.saveNow()
      setStage({ kind: 'plan', plan: await planOrganize(dir, library.guides) })
    } catch {
      setStage(null)
      setNotice({ tone: 'error', text: 'Could not read the folder to prepare Organize.' })
    }
  }

  const confirmOrganize = async (plan: OrganizePlan) => {
    if (!dir) return
    setStage({ kind: 'running', done: 0, total: plan.guides.length })
    try {
      const result = await folder.runExclusive(async () =>
        runOrganize(dir, plan, {
          guidesJson: await readTextFile(dir, GUIDES_FILENAME),
          now: new Date().toISOString(),
          onProgress: (done, count) => setStage({ kind: 'running', done, total: count }),
          onGuide: (guide) => library.applyOrganized([guide]),
        }),
      )
      setStage({ kind: 'report', result, plan })
    } catch (e) {
      setStage(null)
      setNotice({
        tone: 'error',
        text:
          e instanceof OrganizeAbort
            ? e.message
            : 'Organize stopped unexpectedly. Nothing was removed; run it again to continue.',
      })
    }
  }

  const backupFirst = async () => {
    setBackupNote('Preparing the backup…')
    try {
      const files = await exportFullBackup(folder, saveAll)
      setBackupNote(files ? `Backup downloaded (${plural(files, 'file')}).` : 'The folder is empty — nothing to back up.')
    } catch {
      setBackupNote('Could not build the backup.')
    }
  }

  const findFolders = async () => {
    if (!dir) return
    setNotice(null)
    try {
      await library.saveNow()
      const scan = await findUnindexedGuideFolders(dir, library.guides)
      if (scan.found.length > 0) {
        setStage({ kind: 'found', scan })
        return
      }
      setNotice({
        tone: scan.unreadable.length ? 'error' : 'ok',
        text: scan.unreadable.length
          ? `No new guide folders found; ${plural(scan.unreadable.length, 'folder')} could not be read as a guide (${scan.unreadable.slice(0, 3).join(', ')}).`
          : 'No new guide folders found in guides/.',
      })
    } catch {
      setNotice({ tone: 'error', text: 'Could not read the folder.' })
    }
  }

  const addFound = (scan: FolderScan) => {
    library.adoptFolderGuides(scan.found.map((f) => f.guide))
    setStage(null)
    setNotice({ tone: 'ok', text: `Added ${plural(scan.found.length, 'guide')} from their folders.` })
  }

  return (
    <div className="border-line-soft border-t p-4">
      <div className={`flex items-center gap-1.5 ${SECTION_LABEL}`}>
        <FolderIcon className="h-3.5 w-3.5" />
        Folder structure
      </div>
      <p className="text-ink-muted mt-2 text-sm leading-relaxed">{summary}</p>
      {blocked && <p className="mt-1.5 text-xs text-amber-200">{blocked}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!blocked || shared === 0}
          onClick={() => void startOrganize()}
          className={GHOST_BTN_MD}
        >
          Organize folders…
        </button>
        <button type="button" disabled={!!blocked} onClick={() => void findFolders()} className={GHOST_BTN_MD}>
          Find guide folders
        </button>
      </div>
      {notice && (
        <p
          role="status"
          className={`mt-3 rounded-lg border px-2.5 py-2 text-xs ${
            notice.tone === 'ok'
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
              : 'border-rose-400/40 bg-rose-400/10 text-rose-200'
          }`}
        >
          {notice.text}
        </p>
      )}

      {stage?.kind === 'planning' && (
        <Modal title="Organize folders" onClose={() => {}}>
          <p className="text-ink-muted text-sm">Looking at your guides and files…</p>
        </Modal>
      )}

      {stage?.kind === 'plan' && (
        <PlanDialog
          plan={stage.plan}
          backupNote={backupNote}
          onBackup={() => void backupFirst()}
          onCancel={() => setStage(null)}
          onConfirm={() => void confirmOrganize(stage.plan)}
        />
      )}

      {stage?.kind === 'running' && (
        <Modal title="Organizing…" onClose={() => {}}>
          <p className="text-ink-muted text-sm">
            {stage.done} of {plural(stage.total, 'guide')} done. Keep this page open.
          </p>
        </Modal>
      )}

      {stage?.kind === 'report' && <ReportDialog result={stage.result} plan={stage.plan} onClose={() => setStage(null)} />}

      {stage?.kind === 'found' && (
        <Modal
          title="Guide folders found"
          onClose={() => setStage(null)}
          footer={
            <>
              <button type="button" onClick={() => setStage(null)} className={GHOST_BTN_MD}>
                Cancel
              </button>
              <button type="button" onClick={() => addFound(stage.scan)} className={PRIMARY_BTN}>
                Add {plural(stage.scan.found.length, 'guide')}
              </button>
            </>
          }
        >
          <div className="text-ink-muted space-y-3 text-sm">
            <p>These folders in guides/ hold guides that are not in your library yet:</p>
            <ul className={LIST}>
              {stage.scan.found.map((f) => (
                <li key={f.folder}>
                  <span className="text-ink font-medium">{f.guide.title || 'Untitled guide'}</span> — guides/{f.folder}
                  {f.missing.length > 0 && (
                    <span className="block text-amber-200">{plural(f.missing.length, 'file')} it refers to are missing</span>
                  )}
                </li>
              ))}
            </ul>
            {stage.scan.unreadable.length > 0 && (
              <p className="text-xs text-amber-200">
                Could not read: {stage.scan.unreadable.join(', ')}.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function PlanDialog({
  plan,
  backupNote,
  onBackup,
  onCancel,
  onConfirm,
}: {
  plan: OrganizePlan
  backupNote: string | null
  onBackup: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      title="Organize folders"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={GHOST_BTN_MD}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={PRIMARY_BTN}>
            Organize
          </button>
        </>
      }
    >
      <div className="text-ink-muted space-y-3 text-sm leading-relaxed">
        <p>
          {plural(plan.guides.length, 'guide')} will get a folder of their own in <code>guides/</code>:
        </p>
        <ul className={LIST}>
          {plan.guides.map((g) => (
            <li key={g.guide.id}>
              <span className="text-ink font-medium">{g.guide.title || 'Untitled guide'}</span> → guides/{g.folder}
              <span className="text-ink-faint"> · {plural(g.assets.filter((a) => a.status === 'copy').length, 'file')}</span>
            </li>
          ))}
        </ul>
        <p>
          {plural(plan.files, 'file')} ({formatBytes(plan.bytes)}) will be copied.
          {plan.sharedFiles > 0 &&
            ` ${plural(plan.sharedFiles, 'file')} used by more than one guide ${plan.sharedFiles === 1 ? 'is' : 'are'} copied into each.`}
          {plan.shortened > 0 && ` ${plural(plan.shortened, 'very long file name')} will be shortened to keep Windows paths short.`}
        </p>
        <p className="text-ink-faint text-xs">
          Your originals stay where they are, nothing is deleted, and <code>guides.json</code> is copied to{' '}
          <code>legacy-backup/</code> first.
        </p>
        {plan.missing.length > 0 && (
          <div>
            <p className="text-amber-200">
              {plan.missing.length === 1
                ? '1 reference points at a file that is not in the folder (it was already broken):'
                : `${plan.missing.length} references point at files that are not in the folder (they were already broken):`}
            </p>
            <ul className={`${LIST} mt-1`}>
              {plan.missing.slice(0, 20).map((m, i) => (
                <li key={i}>
                  {m.guide || 'Untitled guide'} — {m.ref}
                </li>
              ))}
              {plan.missing.length > 20 && <li>…and {plan.missing.length - 20} more</li>}
            </ul>
          </div>
        )}
        {plan.unreferenced.length > 0 && (
          <p className="text-ink-faint text-xs">
            {plural(plan.unreferenced.length, 'image')} in the folder {plan.unreferenced.length === 1 ? 'is' : 'are'} not
            used by any guide and will be left where {plan.unreferenced.length === 1 ? 'it is' : 'they are'}.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBackup} className={GHOST_BTN}>
            Download a full backup first
          </button>
          {backupNote && <span className="text-ink-faint text-xs">{backupNote}</span>}
        </div>
      </div>
    </Modal>
  )
}

function ReportDialog({ result, plan, onClose }: { result: OrganizeResult; plan: OrganizePlan; onClose: () => void }) {
  return (
    <Modal
      title={result.failed.length ? 'Organized, with some left to do' : 'Organized'}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={PRIMARY_BTN}>
          Close
        </button>
      }
    >
      <div className="text-ink-muted space-y-3 text-sm leading-relaxed">
        <p>
          {plural(result.done.length, 'guide')} now {result.done.length === 1 ? 'has' : 'have'} a folder of their own;{' '}
          {plural(result.copied, 'file')} copied
          {result.alreadyThere > 0 ? ` (${result.alreadyThere} were already in place)` : ''}.
        </p>
        {result.failed.length > 0 && (
          <div>
            <p className="text-rose-200">
              {plural(result.failed.length, 'guide')} could not be finished and {result.failed.length === 1 ? 'was' : 'were'}{' '}
              left exactly as before — run Organize again to retry:
            </p>
            <ul className={`${LIST} mt-1`}>
              {result.failed.map((f) => (
                <li key={f.id}>
                  <span className="text-ink font-medium">{f.title}</span> — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan.missing.length > 0 && (
          <p className="text-xs text-amber-200">
            {plan.missing.length === 1 ? '1 reference' : `${plan.missing.length} references`} could not be copied
            because the file was not in the folder. Drop the file into that guide’s <code>images/</code> folder to fix
            it.
          </p>
        )}
        <p className="text-ink-faint text-xs">
          The old files and your original <code>guides.json</code> (in <code>legacy-backup/</code>) are still there; delete
          them yourself once you are happy.
        </p>
      </div>
    </Modal>
  )
}

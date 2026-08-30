import { useRef } from 'react'
import type { GuidesFolderController } from '../useGuidesFolder'
import {
  AppendIcon,
  DownloadIcon,
  FolderIcon,
  SyncIcon,
  TemplateIcon,
} from './icons'

type SyncPanelProps = {
  folder: GuidesFolderController
  onImport: (text: string) => void
  onExport: () => void
  onTemplate: () => void
  error: string | null
}

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const GHOST_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50'

/**
 * Right-hand Sync box: link an on-disk folder for automatic `guides.json`
 * read/write, plus the always-available Export / Template / Append fallbacks.
 */
export function SyncPanel({
  folder,
  onImport,
  onExport,
  onTemplate,
  error,
}: SyncPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    onImport(await file.text())
  }

  const combinedError = folder.error ?? error

  return (
    <aside className="sticky top-0 flex h-fit flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Sync</h3>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <FolderIcon className="h-3.5 w-3.5" />
          {folder.folderName ?? 'Folder'}
        </div>

        <FolderBody folder={folder} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onExport}
          className="flex flex-col items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <DownloadIcon className="h-4 w-4" />
          Export
        </button>
        <button
          type="button"
          onClick={onTemplate}
          className="flex flex-col items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <TemplateIcon className="h-4 w-4" />
          Template
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <AppendIcon className="h-4 w-4" />
          Append
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <p className="text-xs text-slate-400">
        Append replaces the current list with a guides JSON. With a folder linked,
        every change is written back to <code>guides.json</code> automatically.
      </p>

      {combinedError && <p className="text-xs text-rose-600">{combinedError}</p>}
    </aside>
  )
}

function FolderBody({ folder }: { folder: GuidesFolderController }) {
  if (folder.status === 'unsupported') {
    return (
      <p className="mt-1 text-xs text-slate-500">
        Folder sync needs Chrome or Edge on desktop. Use Export / Append below.
      </p>
    )
  }

  if (folder.status === 'checking') {
    return <p className="mt-1 text-xs text-slate-500">Checking for a linked folder…</p>
  }

  if (folder.status === 'idle') {
    return (
      <>
        <p className="mt-1 text-xs text-slate-500">No folder linked.</p>
        <button
          type="button"
          onClick={() => void folder.link()}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          <FolderIcon className="h-3.5 w-3.5" />
          Link folder
        </button>
      </>
    )
  }

  if (folder.status === 'reconnect') {
    return (
      <>
        <p className="mt-1 text-xs text-slate-500">Permission needed to sync.</p>
        <button
          type="button"
          onClick={() => void folder.reconnect()}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-300"
        >
          <SyncIcon className="h-3.5 w-3.5" />
          Reconnect
        </button>
      </>
    )
  }

  const statusLine =
    folder.status === 'saving'
      ? { text: 'Saving…', tone: 'text-slate-500' }
      : folder.status === 'error'
        ? { text: 'Sync error', tone: 'text-rose-600' }
        : {
            text: folder.lastSyncedAt
              ? `Synced ${clockTime(folder.lastSyncedAt)}`
              : 'Linked',
            tone: 'text-emerald-600',
          }

  return (
    <>
      <p className={`mt-1 text-xs font-medium ${statusLine.tone}`}>{statusLine.text}</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => void folder.saveNow()} className={GHOST_BTN}>
          Save now
        </button>
        <button type="button" onClick={() => void folder.link()} className={GHOST_BTN}>
          Change
        </button>
        <button type="button" onClick={() => void folder.unlink()} className={GHOST_BTN}>
          Unlink
        </button>
      </div>
    </>
  )
}

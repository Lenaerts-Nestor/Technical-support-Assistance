import { useRef } from 'react'
import type { GuidesFolderController } from '../useGuidesFolder'
import {
  CARD,
  CARD_HEADER,
  GHOST_BTN,
  INSET,
  SECTION_LABEL,
} from '../../../shared/ui/styles'
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

const TILE_BTN =
  'border-line bg-canvas text-ink-muted hover:border-brand-line hover:bg-brand-soft hover:text-brand-strong flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors'

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
    <aside className={`${CARD} sticky top-0 flex h-fit flex-col`}>
      <div className={CARD_HEADER}>
        <h3 className="text-ink text-sm font-semibold">Sync</h3>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className={`${INSET} p-3`}>
          <div className={`flex items-center gap-1.5 ${SECTION_LABEL}`}>
            <FolderIcon className="h-3.5 w-3.5" />
            {folder.folderName ?? 'Folder'}
          </div>

          <FolderBody folder={folder} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={onExport} className={TILE_BTN}>
            <DownloadIcon className="h-4 w-4" />
            Export
          </button>
          <button type="button" onClick={onTemplate} className={TILE_BTN}>
            <TemplateIcon className="h-4 w-4" />
            Template
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={TILE_BTN}
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

        <p className="text-ink-faint text-xs leading-relaxed">
          Append replaces the current list with a guides JSON. With a folder
          linked, every change is written back to <code>guides.json</code>{' '}
          automatically.
        </p>

        {combinedError && (
          <p className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-2 text-xs text-rose-200">
            {combinedError}
          </p>
        )}
      </div>
    </aside>
  )
}

/** Colour + copy for each folder-sync state. */
const STATUS_TONE = {
  ok: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  busy: 'border-line bg-subtle text-ink-muted',
  error: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
} as const

function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof STATUS_TONE
  children: React.ReactNode
}) {
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${STATUS_TONE[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

function FolderBody({ folder }: { folder: GuidesFolderController }) {
  if (folder.status === 'unsupported') {
    return (
      <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">
        Folder sync needs Chrome or Edge on desktop. Use Export / Append below.
      </p>
    )
  }

  if (folder.status === 'checking') {
    return (
      <>
        <StatusPill tone="busy">Checking…</StatusPill>
        {/* A stuck check used to leave this panel with no way forward; the retry
            is always offered so the folder can be re-picked regardless. */}
        <button
          type="button"
          onClick={() => void folder.link()}
          className={`${GHOST_BTN} mt-2 w-full`}
        >
          <FolderIcon className="h-3.5 w-3.5" />
          Pick folder again
        </button>
      </>
    )
  }

  if (folder.status === 'idle') {
    return (
      <>
        <p className="text-ink-muted mt-1.5 text-xs">No folder linked.</p>
        <button
          type="button"
          onClick={() => void folder.link()}
          className="bg-brand hover:bg-brand-strong text-on-brand mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
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
        <p className="text-ink-muted mt-1.5 text-xs">Permission needed to sync.</p>
        <button
          type="button"
          onClick={() => void folder.reconnect()}
          className="bg-brand hover:bg-brand-strong text-on-brand mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          <SyncIcon className="h-3.5 w-3.5" />
          Reconnect
        </button>
      </>
    )
  }

  const status =
    folder.status === 'saving'
      ? { text: 'Saving…', tone: 'busy' as const }
      : folder.status === 'error'
        ? { text: 'Sync error', tone: 'error' as const }
        : {
            text: folder.lastSyncedAt
              ? `Synced ${clockTime(folder.lastSyncedAt)}`
              : 'Linked',
            tone: 'ok' as const,
          }

  return (
    <>
      <StatusPill tone={status.tone}>{status.text}</StatusPill>
      <button
        type="button"
        onClick={() => void folder.backupZip()}
        className={`${GHOST_BTN} mt-2.5 w-full`}
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Download folder as .zip
      </button>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
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

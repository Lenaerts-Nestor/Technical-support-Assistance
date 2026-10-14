import { useFolder, useIsEditingGuide } from '../../../app/appDataContext'
import type { FolderController } from '../useFolderLifecycle'
import {
  CARD,
  CARD_HEADER,
  GHOST_BTN,
  INSET,
  SECTION_LABEL,
} from '../../../shared/ui/styles'
import { useSaveAll } from '../useSaveAll'
import { FolderIcon, SyncIcon } from './icons'

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const PRIMARY_ACTION =
  'bg-brand hover:bg-brand-strong text-on-brand mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40'

/** Colour + copy for each folder-sync state. */
const STATUS_TONE = {
  ok: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  busy: 'border-line bg-subtle text-ink-muted',
  error: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
} as const

function StatusPill({ tone, children }: { tone: keyof typeof STATUS_TONE; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${STATUS_TONE[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

/** The one linked folder everything is saved in: pick it, reconnect it, see how it is doing. */
export function FolderCard() {
  const folder = useFolder()
  const editing = useIsEditingGuide()
  const locked = editing ? 'Save or cancel the guide you are editing first.' : folder.busy ? 'Working…' : null

  return (
    <section className={`${CARD} flex flex-col`}>
      <div className={CARD_HEADER}>
        <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <SyncIcon className="text-brand-strong h-4 w-4" />
          Linked folder
        </h3>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_320px] md:items-start">
        <p className="text-ink-muted text-sm leading-relaxed">
          Guides, links and case snippets are saved into one folder on this computer, so they survive clearing the
          browser and can be backed up or shared. Pick the folder once; changes are written back automatically.
          {!folder.supported && (
            <span className="mt-2 block text-amber-200">
              This browser can’t link a folder — that needs Chrome or Edge on desktop. Links and Case snippets still
              work below, and guides can be exchanged as JSON.
            </span>
          )}
        </p>

        <div className={`${INSET} p-3`}>
          <div className={`flex items-center gap-1.5 ${SECTION_LABEL}`}>
            <FolderIcon className="h-3.5 w-3.5" />
            {folder.folderName ?? 'Folder'}
          </div>
          <FolderBody folder={folder} lockedReason={locked} />
          {locked && <p className="mt-2 text-xs text-amber-200">{locked}</p>}
          {folder.error && (
            <p className="mt-2 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-2 text-xs text-rose-200">
              {folder.error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function FolderBody({ folder, lockedReason }: { folder: FolderController; lockedReason: string | null }) {
  const saveAll = useSaveAll()
  const locked = lockedReason !== null

  if (folder.status === 'unsupported') {
    return <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">Folder sync isn’t available in this browser.</p>
  }

  if (folder.status === 'checking') {
    return (
      <div className="mt-2">
        <StatusPill tone="busy">Checking…</StatusPill>
        {/* A stuck check used to leave this panel with no way forward; the retry
            is always offered so the folder can be re-picked regardless. */}
        <button type="button" disabled={locked} onClick={() => void folder.link()} className={`${GHOST_BTN} mt-2 w-full`}>
          <FolderIcon className="h-3.5 w-3.5" />
          Pick folder again
        </button>
      </div>
    )
  }

  if (folder.status === 'idle') {
    return (
      <>
        <p className="text-ink-muted mt-1.5 text-xs">No folder linked.</p>
        <button type="button" disabled={locked} onClick={() => void folder.link()} className={PRIMARY_ACTION}>
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
        <button type="button" disabled={locked} onClick={() => void folder.reconnect()} className={PRIMARY_ACTION}>
          <SyncIcon className="h-3.5 w-3.5" />
          Reconnect
        </button>
        <button type="button" disabled={locked} onClick={() => void folder.link()} className={`${GHOST_BTN} mt-1.5 w-full`}>
          Pick a different folder
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
            text: folder.lastSyncedAt ? `Synced ${clockTime(folder.lastSyncedAt)}` : 'Linked',
            tone: 'ok' as const,
          }

  return (
    <>
      <div className="mt-2">
        <StatusPill tone={status.tone}>{status.text}</StatusPill>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => void saveAll()} className={GHOST_BTN}>
          Save now
        </button>
        <button type="button" disabled={locked} onClick={() => void folder.link()} className={GHOST_BTN}>
          Change
        </button>
        <button type="button" disabled={locked} onClick={() => void folder.unlink()} className={GHOST_BTN}>
          Unlink
        </button>
      </div>
    </>
  )
}

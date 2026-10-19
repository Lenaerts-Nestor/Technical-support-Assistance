import { useState } from 'react'
import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, COUNT_BADGE, GHOST_BTN, ICON_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { ChevronIcon, FolderIcon, PencilIcon, PlayIcon } from './icons'
import { MethodBadge } from './MethodBadge'
import type { NvxCall, NvxFolder } from '../types'

type SavedCallsCardProps = {
  calls: NvxCall[]
  folders: NvxFolder[]
  /** Why nothing can be read right now (no unit ticked, no password…), or `null`. */
  readBlockedReason: string | null
  /** Why a change cannot be sent right now, or `null`. */
  changeBlockedReason: string | null
  running: boolean
  /** How many units a run goes to. */
  unitCount: number
  /** Put a call into the request builder. */
  onLoad: (call: NvxCall) => void
  /** Run one call: a GET at once, anything else after a review. */
  onRun: (call: NvxCall) => void
  /** Run these GET calls together. */
  onRunMany: (calls: NvxCall[]) => void
  onEditCall: (call: NvxCall) => void
  onAddFolder: () => void
  onEditFolder: (folder: NvxFolder) => void
}

/**
 * The saved requests, vertically and compactly, with the ones in folders grouped under their folder.
 * Clicking a name loads it into the builder; the play button runs it. "Run all" and a folder's run
 * button only run GET calls: nothing that changes a device runs without a review.
 */
export function SavedCallsCard(props: SavedCallsCardProps) {
  const { calls, folders, readBlockedReason, changeBlockedReason, running, unitCount } = props
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const toggle = (folderId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(folderId)) next.add(folderId)
      return next
    })

  const reads = (list: NvxCall[]) => list.filter((c) => c.method === 'GET')
  const canRead = readBlockedReason === null && !running
  const topLevel = calls.filter((c) => !c.folderId)

  const row = (call: NvxCall) => {
    const isRead = call.method === 'GET'
    const reason = isRead ? readBlockedReason : changeBlockedReason
    return (
      <li key={call.id} className="hover:bg-subtle group flex items-center gap-1 pr-2 pl-4">
        <button type="button" onClick={() => props.onLoad(call)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left" title={`${call.method} ${call.path}`}>
          <MethodBadge method={call.method} />
          <span className="text-ink truncate text-sm font-medium">{call.title}</span>
          <span className="text-ink-faint hidden truncate font-mono text-xs xl:inline">{call.path}</span>
        </button>
        <button
          type="button"
          className={ICON_BTN}
          disabled={reason !== null || running}
          title={reason ?? (isRead ? 'Run on the ticked units' : 'Review, then send')}
          aria-label={`${isRead ? 'Run' : 'Review'} ${call.title}`}
          onClick={() => props.onRun(call)}
        >
          <PlayIcon className="h-3 w-3" />
        </button>
        <button type="button" className={ICON_BTN} aria-label={`Edit ${call.title}`} onClick={() => props.onEditCall(call)}>
          <PencilIcon className="h-3 w-3" />
        </button>
      </li>
    )
  }

  return (
    <section className={CARD} aria-label="Saved calls">
      <header className={CARD_HEADER}>
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Saved calls <span className={COUNT_BADGE}>{calls.length}</span>
          {unitCount > 1 && <span className="text-ink-muted font-normal tracking-normal normal-case">· runs on {unitCount} units</span>}
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" className={GHOST_BTN} onClick={props.onAddFolder}>
            <PlusIcon className="h-3.5 w-3.5" />
            Folder
          </button>
          <button type="button" className={GHOST_BTN} disabled={!canRead || reads(calls).length === 0} title="Runs every GET call" onClick={() => props.onRunMany(reads(calls))}>
            <PlayIcon className="h-3.5 w-3.5" />
            Run all
          </button>
        </div>
      </header>
      {readBlockedReason && <p className="text-ink-muted border-line-soft border-b px-4 py-2 text-sm">{readBlockedReason}</p>}
      {calls.length === 0 && folders.length === 0 ? (
        <p className="text-ink-muted px-4 py-6 text-center text-sm">No saved calls yet. Build a request below and save it with a title.</p>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto py-1">
          {topLevel.length > 0 && <ul>{topLevel.map(row)}</ul>}
          {folders.map((folder) => {
            const inFolder = calls.filter((c) => c.folderId === folder.id)
            const isOpen = !collapsed.has(folder.id)
            return (
              <div key={folder.id} className="border-line-soft border-t first:border-t-0">
                <div className="flex items-center gap-1 pr-2">
                  <button type="button" aria-expanded={isOpen} onClick={() => toggle(folder.id)} className="text-ink hover:text-brand flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left">
                    <ChevronIcon open={isOpen} className="h-3.5 w-3.5" />
                    <FolderIcon className="text-brand h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-semibold">{folder.name}</span>
                    <span className={COUNT_BADGE}>{inFolder.length}</span>
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    disabled={!canRead || reads(inFolder).length === 0}
                    title={`Run the GET calls in ${folder.name}`}
                    aria-label={`Run the GET calls in ${folder.name}`}
                    onClick={() => props.onRunMany(reads(inFolder))}
                  >
                    <PlayIcon className="h-3 w-3" />
                  </button>
                  <button type="button" className={ICON_BTN} aria-label={`Rename or delete ${folder.name}`} onClick={() => props.onEditFolder(folder)}>
                    <PencilIcon className="h-3 w-3" />
                  </button>
                </div>
                {isOpen && (inFolder.length > 0 ? <ul className="pl-3">{inFolder.map(row)}</ul> : <p className="text-ink-faint px-10 pb-2 text-xs">Empty. Choose this folder when saving a call.</p>)}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

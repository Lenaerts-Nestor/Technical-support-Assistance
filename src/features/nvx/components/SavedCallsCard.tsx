import { useState } from 'react'
import { PlusIcon } from '../../../shared/ui/icons'
import { CARD, CARD_HEADER, COUNT_BADGE, GHOST_BTN, ICON_BTN, INPUT, SECTION_LABEL } from '../../../shared/ui/styles'
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
  /** The call last loaded into the builder, highlighted. */
  activeId: string | null
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
  const { calls, folders, readBlockedReason, changeBlockedReason, running, unitCount, activeId } = props
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [query, setQuery] = useState('')
  const toggle = (folderId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(folderId)) next.add(folderId)
      return next
    })

  const needle = query.trim().toLowerCase()
  const visible = needle ? calls.filter((c) => `${c.title} ${c.path} ${c.method}`.toLowerCase().includes(needle)) : calls
  const reads = (list: NvxCall[]) => list.filter((c) => c.method === 'GET')
  const canRead = readBlockedReason === null && !running
  const topLevel = visible.filter((c) => !c.folderId)

  const row = (call: NvxCall) => {
    const isRead = call.method === 'GET'
    const reason = isRead ? readBlockedReason : changeBlockedReason
    const active = call.id === activeId
    return (
      <li
        key={call.id}
        className={`group relative flex items-center rounded-md transition-colors ${active ? 'bg-brand-soft' : 'hover:bg-subtle'}`}
      >
        <button type="button" onClick={() => props.onLoad(call)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left" title={`${call.method} ${call.path}`}>
          <MethodBadge method={call.method} />
          <span className="min-w-0">
            <span className={`block truncate text-sm font-medium ${active ? 'text-brand-strong' : 'text-ink'}`}>{call.title}</span>
            <span className="text-ink-faint block truncate font-mono text-[11px]">{call.path}</span>
          </span>
        </button>
        <span className="bg-surface absolute top-1/2 right-1 hidden -translate-y-1/2 gap-1 rounded-md group-focus-within:flex group-hover:flex">
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
        </span>
      </li>
    )
  }

  const nothingMatches = needle !== '' && visible.length === 0

  return (
    <section className={`${CARD} flex min-h-0 flex-col`} aria-label="Saved calls">
      <header className={CARD_HEADER}>
        <h3 className={`${SECTION_LABEL} flex items-center gap-2`}>
          Saved calls <span className={COUNT_BADGE}>{calls.length}</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <button type="button" className={GHOST_BTN} onClick={props.onAddFolder} title="New folder">
            <PlusIcon className="h-3.5 w-3.5" />
            Folder
          </button>
          <button
            type="button"
            className={GHOST_BTN}
            disabled={!canRead || reads(calls).length === 0}
            title={`Runs every GET call${unitCount > 1 ? ` on ${unitCount} units` : ''}`}
            onClick={() => props.onRunMany(reads(calls))}
          >
            <PlayIcon className="h-3 w-3" />
            Run all
          </button>
        </div>
      </header>
      {calls.length > 4 && (
        <div className="border-line-soft border-b p-2">
          <input
            className={INPUT}
            type="search"
            value={query}
            placeholder="Filter saved calls"
            aria-label="Filter saved calls"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      {readBlockedReason && <p className="text-ink-muted border-line-soft border-b bg-amber-500/5 px-4 py-2 text-xs">{readBlockedReason}</p>}
      {calls.length === 0 && folders.length === 0 ? (
        <p className="text-ink-muted px-4 py-8 text-center text-sm">No saved calls yet. Build a request and save it with a title.</p>
      ) : nothingMatches ? (
        <p className="text-ink-muted px-4 py-6 text-center text-sm">No saved call matches “{query.trim()}”.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {topLevel.length > 0 && <ul className="space-y-0.5">{topLevel.map(row)}</ul>}
          {folders.map((folder) => {
            const inFolder = visible.filter((c) => c.folderId === folder.id)
            if (needle && inFolder.length === 0) return null
            const isOpen = needle ? true : !collapsed.has(folder.id)
            return (
              <div key={folder.id}>
                <div className="group relative flex items-center">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(folder.id)}
                    className="text-ink hover:text-brand flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left"
                  >
                    <ChevronIcon open={isOpen} className="h-3 w-3" />
                    <FolderIcon className="text-brand h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-semibold">{folder.name}</span>
                    <span className={COUNT_BADGE}>{inFolder.length}</span>
                  </button>
                  <span className="bg-surface absolute top-1/2 right-1 hidden -translate-y-1/2 gap-1 rounded-md group-focus-within:flex group-hover:flex">
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
                  </span>
                </div>
                {isOpen &&
                  (inFolder.length > 0 ? (
                    <ul className="border-line-soft ml-4 space-y-0.5 border-l pl-1.5">{inFolder.map(row)}</ul>
                  ) : (
                    <p className="text-ink-faint px-9 pb-1 text-xs">Empty. Choose this folder when saving a call.</p>
                  ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

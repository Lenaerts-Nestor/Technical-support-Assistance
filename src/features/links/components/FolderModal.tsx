import { useEffect, useState } from 'react'
import { CARD, GHOST_BTN, INPUT } from '../../../shared/ui/styles'
import { PlusIcon } from '../../../shared/ui/icons'
import { filterFolderLinks } from '../linksData'
import { LinkForm } from './LinkForm'
import { LinkRow } from './LinkRow'
import { CloseIcon, FolderIcon, SearchIcon } from './icons'
import type { LinksController } from '../useLinks'
import type { LinkFolder } from '../types'

type FolderModalProps = {
  folder: LinkFolder
  sectionId: string
  links: LinksController
  editing: boolean
  /** The page's search text, carried in so the list opens already narrowed. */
  initialQuery: string
  onClose: () => void
}

/** A folder's links in a dialog, with its own filter box. Esc or a click outside closes it. */
export function FolderModal({ folder, sectionId, links, editing, initialQuery, onClose }: FolderModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [adding, setAdding] = useState(false)
  const visible = filterFolderLinks(folder, query)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={folder.label}
        className={`${CARD} flex max-h-[84vh] w-full max-w-xl flex-col border-l-4 border-l-sky-400 p-4`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-ink flex min-w-0 items-center gap-2 text-base font-semibold">
            <FolderIcon className="h-4 w-4 shrink-0 text-sky-300" />
            <span className="truncate">{folder.label}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint hover:bg-subtle hover:text-ink rounded-md p-1.5 transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <SearchIcon className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <input
            className={`${INPUT} !pl-8`}
            placeholder="Filter links…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="-mr-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {visible.map((link) => (
            <LinkRow key={link.id} link={link} links={links} editing={editing} />
          ))}
          {visible.length === 0 && !adding && (
            <p className="text-ink-faint px-1 py-4 text-center text-xs">
              {folder.links.length === 0 ? 'No links in this folder yet.' : 'No links match.'}
            </p>
          )}
          {adding && (
            <LinkForm
              labelPlaceholder="Name"
              submitLabel="Add link"
              onSubmit={(label, url) => {
                if (!links.addLink(sectionId, folder.id, label, url)) return false
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>

        {editing && !adding && (
          <div className="mt-3">
            <button type="button" className={GHOST_BTN} onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

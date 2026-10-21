import { useState } from 'react'
import { CARD, COUNT_BADGE, GHOST_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { PlusIcon } from '../../../shared/ui/icons'
import { SECTION_TONES } from '../linksData'
import { FolderRow } from './FolderRow'
import { LinkForm } from './LinkForm'
import { LinkRow, RowTools } from './LinkRow'
import { ArrowLeftIcon, ArrowRightIcon, FolderIcon, GripIcon, LinkIcon } from './icons'
import type { LinksController } from '../useLinks'
import type { LinkSection } from '../types'

type SectionCardProps = {
  /** Possibly narrowed by the search; the controller still holds the full data. */
  section: LinkSection
  /** Position in the page, for the accent colour and for reordering. */
  index: number
  /** Total sections, so the first/last card can disable its arrow. */
  count: number
  links: LinksController
  editing: boolean
  searching: boolean
  onOpenFolder: (folderId: string) => void
}

type Adding = 'link' | 'folder' | null

/** Custom drag payload type, so only a section drag (not text or files) can drop on a card. */
const DRAG_TYPE = 'application/x-links-section'

/** One titled card of links and folders. */
export function SectionCard({ section, index, count, links, editing, searching, onOpenFolder }: SectionCardProps) {
  const tone = SECTION_TONES[index % SECTION_TONES.length]
  const [adding, setAdding] = useState<Adding>(null)
  const [renaming, setRenaming] = useState(false)
  const [dropTarget, setDropTarget] = useState(false)
  const folders = section.items.filter((item) => item.kind === 'folder')
  const canReorder = editing && !searching && count > 1

  const removeSection = () => {
    const n = section.items.length
    if (n === 0 || window.confirm(`Delete the section "${section.title}" and everything in it?`)) {
      links.removeSection(section.id)
    }
  }

  return (
    <section
      // A fixed height, not "as tall as its links": the list scrolls inside, so the board stays an even grid however many links a section holds.
      className={`${CARD} flex h-[clamp(16rem,38vh,26rem)] flex-col border-l-4 ${tone.bar} p-3 ${dropTarget ? 'ring-brand ring-2' : ''}`}
      onDragOver={(e) => {
        if (!canReorder || !e.dataTransfer.types.includes(DRAG_TYPE)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropTarget(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(false)
      }}
      onDrop={(e) => {
        setDropTarget(false)
        const id = e.dataTransfer.getData(DRAG_TYPE)
        if (!canReorder || !id) return
        e.preventDefault()
        links.moveSection(id, index)
      }}
    >
      {renaming ? (
        <LinkForm
          withUrl={false}
          initialLabel={section.title}
          labelPlaceholder="Section name"
          submitLabel="Save"
          onSubmit={(title) => {
            links.renameSection(section.id, title)
            setRenaming(false)
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <header className="mb-2.5 flex shrink-0 items-center justify-between gap-2 px-1">
          <h3 className="text-ink flex min-w-0 items-center gap-2 text-base font-bold tracking-tight">
            {canReorder && (
              <span
                draggable
                title="Drag to move this section"
                aria-hidden="true"
                className="text-ink-faint hover:text-ink -ml-1 shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, section.id)
                  e.dataTransfer.effectAllowed = 'move'
                  const card = e.currentTarget.closest('section')
                  if (card) e.dataTransfer.setDragImage(card, 16, 16)
                }}
                onDragEnd={() => setDropTarget(false)}
              >
                <GripIcon className="h-4 w-4" />
              </span>
            )}
            <LinkIcon className={`h-4.5 w-4.5 shrink-0 ${tone.icon}`} />
            <span className="truncate">{section.title}</span>
            <span className={COUNT_BADGE} title={`${section.items.length} in this section`}>
              {section.items.length}
            </span>
          </h3>
          {editing && !searching && (
            <div className="flex shrink-0 items-center gap-1">
              <RowTools label={section.title} onEdit={() => setRenaming(true)} onDelete={removeSection} />
            </div>
          )}
        </header>
      )}

      <div className="-mr-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1.5">
        {section.items.length === 0 && !adding && (
          <div className="border-line text-ink-muted flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 text-center">
            <LinkIcon className="text-ink-faint h-5 w-5" />
            <p className="text-sm font-medium">No links yet</p>
            <p className="text-ink-faint text-xs">{editing ? 'Use + Link below to add one.' : 'Use Edit to add some.'}</p>
          </div>
        )}

        {/* Plain links first, folders pinned to the bottom of the section. */}
        {[...section.items.filter((item) => item.kind === 'link'), ...folders].map((item) =>
          item.kind === 'folder' ? (
            <FolderRow
              key={item.id}
              folder={item}
              links={links}
              editing={editing && !searching}
              onOpen={() => onOpenFolder(item.id)}
            />
          ) : (
            <LinkRow key={item.id} link={item} links={links} editing={editing && !searching} />
          ),
        )}

        {adding === 'link' && (
          <LinkForm
            labelPlaceholder="Name"
            submitLabel="Add link"
            onSubmit={(label, url) => {
              if (!links.addLink(section.id, null, label, url)) return false
              setAdding(null)
            }}
            onCancel={() => setAdding(null)}
          />
        )}
        {adding === 'folder' && (
          <LinkForm
            withUrl={false}
            labelPlaceholder="Folder name"
            submitLabel="Add folder"
            onSubmit={(label) => {
              links.addFolder(section.id, label)
              setAdding(null)
            }}
            onCancel={() => setAdding(null)}
          />
        )}
      </div>

      {editing && !searching && !adding && (
        <div className="mt-2.5 flex shrink-0 gap-1.5">
          <button type="button" className={GHOST_BTN} onClick={() => setAdding('link')}>
            <PlusIcon className="h-3.5 w-3.5" />
            Link
          </button>
          <button type="button" className={GHOST_BTN} onClick={() => setAdding('folder')}>
            <FolderIcon className="h-3.5 w-3.5" />
            Folder
          </button>
          {canReorder && (
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                className={ICON_BTN}
                disabled={index === 0}
                onClick={() => links.moveSection(section.id, index - 1)}
                aria-label={`Move ${section.title} earlier`}
                title="Move earlier"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={ICON_BTN}
                disabled={index === count - 1}
                onClick={() => links.moveSection(section.id, index + 1)}
                aria-label={`Move ${section.title} later`}
                title="Move later"
              >
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

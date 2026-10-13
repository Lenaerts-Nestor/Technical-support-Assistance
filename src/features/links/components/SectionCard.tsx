import { useState } from 'react'
import { CARD, GHOST_BTN } from '../../../shared/ui/styles'
import { PlusIcon } from '../../../shared/ui/icons'
import { SECTION_TONES } from '../linksData'
import { FolderRow } from './FolderRow'
import { LinkForm } from './LinkForm'
import { LinkRow, RowTools } from './LinkRow'
import { FolderIcon, LinkIcon } from './icons'
import type { LinksController } from '../useLinks'
import type { LinkSection } from '../types'

type SectionCardProps = {
  /** Possibly narrowed by the search; the controller still holds the full data. */
  section: LinkSection
  /** Position in the page, for the accent colour. */
  index: number
  links: LinksController
  editing: boolean
  searching: boolean
  onOpenFolder: (folderId: string) => void
}

type Adding = 'link' | 'folder' | null

/** One titled card of links and folders. */
export function SectionCard({ section, index, links, editing, searching, onOpenFolder }: SectionCardProps) {
  const tone = SECTION_TONES[index % SECTION_TONES.length]
  const [adding, setAdding] = useState<Adding>(null)
  const [renaming, setRenaming] = useState(false)

  const removeSection = () => {
    const n = section.items.length
    if (n === 0 || window.confirm(`Delete the section "${section.title}" and everything in it?`)) {
      links.removeSection(section.id)
    }
  }

  return (
    <section className={`${CARD} border-l-4 ${tone.bar} p-3`}>
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
        <header className="mb-2.5 flex items-center justify-between gap-2 px-1">
          <h3 className="text-ink flex min-w-0 items-center gap-2 text-sm font-semibold">
            <LinkIcon className={`h-4 w-4 shrink-0 ${tone.icon}`} />
            <span className="truncate">{section.title}</span>
          </h3>
          {editing && !searching && (
            <RowTools label={section.title} onEdit={() => setRenaming(true)} onDelete={removeSection} />
          )}
        </header>
      )}

      <div className="space-y-1.5">
        {section.items.length === 0 && !adding && (
          <p className="text-ink-faint px-1 py-2 text-xs">
            No links yet.{!editing && ' Use Edit to add some.'}
          </p>
        )}

        {section.items.map((item) =>
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
        <div className="mt-2.5 flex gap-1.5">
          <button type="button" className={GHOST_BTN} onClick={() => setAdding('link')}>
            <PlusIcon className="h-3.5 w-3.5" />
            Link
          </button>
          <button type="button" className={GHOST_BTN} onClick={() => setAdding('folder')}>
            <FolderIcon className="h-3.5 w-3.5" />
            Folder
          </button>
        </div>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useLinksData } from '../../app/appDataContext'
import { filterSections } from './linksData'
import { FolderModal } from './components/FolderModal'
import { LinkForm } from './components/LinkForm'
import { SectionCard } from './components/SectionCard'
import { SearchIcon } from './components/icons'
import { PlusIcon } from '../../shared/ui/icons'
import { EMPTY, GHOST_BTN_MD, INPUT, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN } from '../../shared/ui/styles'

/** Quick-launch board: sections of links, with folders that open in a dialog. */
export function LinksPage() {
  const links = useLinksData()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)

  const searching = query.trim() !== ''
  const shown = filterSections(links.sections, query)

  // The open folder is looked up live, so edits made inside the dialog show at once.
  const open = openFolderId
    ? links.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.kind === 'folder' && item.id === openFolderId ? [{ section, folder: item }] : [],
        ),
      )[0]
    : undefined

  return (
    <div className="mx-auto flex h-full min-h-[34rem] max-w-[1600px] flex-col gap-6 px-8 py-7">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={PAGE_TITLE}>Links</h2>
          <p className={PAGE_SUBTITLE}>
            Quick links to the tools and sites you use
            {links.savedToFile && <span className="text-ink-faint"> · saved to links.json</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              className={GHOST_BTN_MD}
              aria-pressed={addingSection}
              onClick={() => setAddingSection((v) => !v)}
            >
              <PlusIcon className="h-4 w-4" />
              Add section
            </button>
          )}
          <div className="relative">
            <SearchIcon className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              className={`${INPUT} w-72 !pl-8`}
              placeholder="Search links…"
              aria-label="Search links"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={editing ? PRIMARY_BTN : GHOST_BTN_MD}
            aria-pressed={editing}
            onClick={() => {
              setEditing((v) => !v)
              setAddingSection(false)
            }}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </header>

      {shown.length === 0 ? (
        <div className={EMPTY}>
          {searching
            ? 'No links match your search.'
            : 'No sections yet. Use Edit, then Add section to create one.'}
        </div>
      ) : (
        // The grid is its own scrollport and sized to the window: two rows of cards (four columns on wide screens)
        // fill it exactly, so eight cards are always in view. More sections scroll in one row at a time (snap).
        <div className="-m-1 grid min-h-0 flex-1 scroll-p-1 snap-y snap-mandatory auto-rows-[calc((100%_-_(var(--rows)_-_1)_*_1rem)_/_var(--rows))] grid-cols-2 gap-4 overflow-y-auto overscroll-contain p-1 [--rows:4] xl:grid-cols-4 xl:[--rows:2]">
          {shown.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              // Colours follow the full list so a search doesn't recolour the cards.
              index={links.sections.findIndex((s) => s.id === section.id)}
              count={links.sections.length}
              links={links}
              editing={editing}
              searching={searching}
              onOpenFolder={setOpenFolderId}
            />
          ))}
        </div>
      )}

      {editing && addingSection && (
        <div className="max-w-sm shrink-0">
          <LinkForm
            withUrl={false}
            labelPlaceholder="Section name"
            submitLabel="Add section"
            onSubmit={(title) => {
              links.addSection(title)
              setAddingSection(false)
            }}
            onCancel={() => setAddingSection(false)}
          />
        </div>
      )}

      {open && (
        <FolderModal
          key={open.folder.id}
          folder={open.folder}
          sectionId={open.section.id}
          links={links}
          editing={editing}
          initialQuery={query}
          onClose={() => setOpenFolderId(null)}
        />
      )}
    </div>
  )
}

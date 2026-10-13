import { useState } from 'react'
import { DELETE_BTN } from '../../../shared/ui/styles'
import { TrashIcon } from '../../../shared/ui/icons'
import { LinkForm } from './LinkForm'
import { LinkIcon, PencilIcon } from './icons'
import type { LinksController } from '../useLinks'
import type { LinkEntry } from '../types'

/** Shared look of every row: a link, a folder, or a button in the folder modal. */
export const ROW =
  'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line-soft bg-subtle px-2.5 py-2 text-left text-sm text-ink transition-colors hover:border-line-strong hover:bg-line-soft'

/** Pencil + trash shown beside a row while the page is in edit mode. */
export function RowTools({
  label,
  onEdit,
  onDelete,
}: {
  label: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        title="Edit"
        className="text-ink-faint hover:bg-subtle hover:text-ink rounded-md p-1.5 transition-colors"
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        title="Delete"
        className={`${DELETE_BTN} p-1.5`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

type LinkRowProps = {
  link: LinkEntry
  links: LinksController
  editing: boolean
}

/** One link: opens in a new tab, or edits in place while the page is in edit mode. */
export function LinkRow({ link, links, editing }: LinkRowProps) {
  const [renaming, setRenaming] = useState(false)

  if (renaming) {
    return (
      <LinkForm
        initialLabel={link.label}
        initialUrl={link.url}
        labelPlaceholder="Name"
        submitLabel="Save"
        onSubmit={(label, url) => {
          if (!links.updateItem(link.id, { label, url })) return false
          setRenaming(false)
        }}
        onCancel={() => setRenaming(false)}
      />
    )
  }

  return (
    <div className="flex items-center gap-1">
      <a href={link.url} target="_blank" rel="noreferrer" title={link.url} className={ROW}>
        <LinkIcon className="text-ink-faint h-4 w-4 shrink-0" />
        <span className="truncate">{link.label}</span>
      </a>
      {editing && (
        <RowTools
          label={link.label}
          onEdit={() => setRenaming(true)}
          onDelete={() => links.removeItem(link.id)}
        />
      )}
    </div>
  )
}

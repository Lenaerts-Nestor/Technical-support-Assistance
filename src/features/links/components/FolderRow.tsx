import { useState } from 'react'
import { COUNT_BADGE } from '../../../shared/ui/styles'
import { LinkForm } from './LinkForm'
import { ROW, RowTools } from './LinkRow'
import { ChevronRightIcon, FolderIcon } from './icons'
import type { LinksController } from '../useLinks'
import type { LinkFolder } from '../types'

type FolderRowProps = {
  folder: LinkFolder
  links: LinksController
  editing: boolean
  onOpen: () => void
}

/** A folder inside a section: one row with its link count, opening the modal. */
export function FolderRow({ folder, links, editing, onOpen }: FolderRowProps) {
  const [renaming, setRenaming] = useState(false)

  if (renaming) {
    return (
      <LinkForm
        withUrl={false}
        initialLabel={folder.label}
        labelPlaceholder="Folder name"
        submitLabel="Save"
        onSubmit={(label) => {
          links.updateItem(folder.id, { label })
          setRenaming(false)
        }}
        onCancel={() => setRenaming(false)}
      />
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onOpen} className={ROW} aria-haspopup="dialog">
        <FolderIcon className="text-ink-faint h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{folder.label}</span>
        <span className={COUNT_BADGE}>{folder.links.length}</span>
        <ChevronRightIcon className="text-ink-faint h-3.5 w-3.5 shrink-0" />
      </button>
      {editing && (
        <RowTools
          label={folder.label}
          onEdit={() => setRenaming(true)}
          onDelete={() => {
            const n = folder.links.length
            if (n === 0 || window.confirm(`Delete "${folder.label}" and its ${n} link${n === 1 ? '' : 's'}?`)) {
              links.removeItem(folder.id)
            }
          }}
        />
      )}
    </div>
  )
}

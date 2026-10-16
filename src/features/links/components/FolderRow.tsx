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
      <button
        type="button"
        onClick={onOpen}
        className={`${ROW} !border-amber-400/50 !bg-amber-400/10 hover:!border-amber-300 hover:!bg-amber-400/20`}
        aria-haspopup="dialog"
      >
        <FolderIcon className="h-4.5 w-4.5 shrink-0 text-amber-300" />
        <span className="flex-1 truncate">{folder.label}</span>
        <span className={COUNT_BADGE}>{folder.links.length}</span>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-amber-300" />
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

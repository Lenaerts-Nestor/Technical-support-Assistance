import { useId } from 'react'
import { DownloadIcon, XIcon } from '../components/icons'
import { useGuideZipPicker } from '../view/GuideAssetsContext'
import { DELETE_BTN, GHOST_BTN } from '../../../shared/ui/styles'
import { GroupLabel, INPUT } from './fields'

type ProjectZipFieldProps = {
  value?: string
  onChange: (zip: string) => void
}

/**
 * Attach a project zip to a heading: pick one (a file from outside the linked
 * folder is copied into `projects/`), or type / autocomplete a path that is
 * already there. Readers get a "Project" download button on the heading.
 */
export function ProjectZipField({ value = '', onChange }: ProjectZipFieldProps) {
  const { zipNames, pickZip } = useGuideZipPicker()
  const listId = useId()

  const browse = async () => {
    const path = await pickZip()
    if (path) onChange(path)
  }

  return (
    <div>
      <GroupLabel className="mb-1.5">
        Project zip <span className="font-normal tracking-normal normal-case">— optional download</span>
      </GroupLabel>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void browse()}
          title="Choose a zip — a file from outside the linked folder is copied into its projects/ folder"
          className={GHOST_BTN}
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          {value ? 'Change zip' : 'Choose zip'}
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="No zip — or type projects/my-project.zip…"
          aria-label="Project zip path"
          list={zipNames.length > 0 ? listId : undefined}
          className={`${INPUT} min-w-48 max-w-[360px] flex-1`}
        />
        {zipNames.length > 0 && (
          <datalist id={listId}>
            {zipNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove project zip"
            title="Remove project zip"
            className={`${DELETE_BTN} p-1`}
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

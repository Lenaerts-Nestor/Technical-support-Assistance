import { useState } from 'react'
import { DownloadIcon } from '../components/icons'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { useGuideZip } from './GuideAssetsContext'

type ProjectDownloadButtonProps = {
  /** Zip path stored on the heading; renders nothing when unset. */
  path?: string
  /** Extra classes for the colour context it sits in (e.g. the tinted chapter band). */
  className?: string
}

/** "Project" download at the right edge of an H2 band / H3 heading. */
export function ProjectDownloadButton({ path, className }: ProjectDownloadButtonProps) {
  const { available, download } = useGuideZip(path)
  const [failed, setFailed] = useState(false)
  if (!path) return null

  const file = path.split('/').pop() ?? path
  const title = failed
    ? `Could not read "${file}" from the linked folder`
    : available
      ? `Download ${file}`
      : `${file} is not in the linked folder — link the folder that holds the project zips`

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => void download().then((ok) => setFailed(!ok))}
      title={title}
      aria-label={`Download project zip: ${file}`}
      className={`${GHOST_BTN} shrink-0 ${failed ? 'border-rose-500/50 text-rose-300' : ''} ${className ?? ''}`}
    >
      <DownloadIcon className="h-3.5 w-3.5" />
      Project
    </button>
  )
}

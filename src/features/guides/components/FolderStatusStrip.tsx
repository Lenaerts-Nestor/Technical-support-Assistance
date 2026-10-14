import { useContext } from 'react'
import { useFolder } from '../../../app/appDataContext'
import { NavigationContext } from '../../../app/navigation'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { useGuidesToOrganize } from '../../sync/useGuidesToOrganize'

const AMBER = 'border-amber-400/40 bg-amber-400/10 text-amber-100'
const ROSE = 'border-rose-400/40 bg-rose-400/10 text-rose-100'
const SKY = 'border-sky-400/40 bg-sky-400/10 text-sky-100'

/**
 * One line above the Guides list / a guide when the linked folder needs
 * attention: after every browser restart the folder asks for permission again,
 * and without this the page would just look empty. Renders nothing when all is well.
 */
export function FolderStatusStrip() {
  const folder = useFolder()
  const goTo = useContext(NavigationContext)
  const toOrganize = useGuidesToOrganize()

  let tone: string
  let text: string
  let action: React.ReactNode

  if (folder.status === 'reconnect') {
    tone = AMBER
    text = `Folder “${folder.folderName ?? 'linked folder'}” needs your permission to load and save guides.${
      folder.error ? ` ${folder.error}` : ''
    }`
    action = (
      <button type="button" onClick={() => void folder.reconnect()} className={GHOST_BTN}>
        Reconnect
      </button>
    )
  } else if (folder.status === 'error' || folder.error) {
    tone = ROSE
    text = folder.error ?? 'Syncing with the linked folder failed.'
    action = (
      <button type="button" onClick={() => goTo('sync')} className={GHOST_BTN}>
        Open Sync
      </button>
    )
  } else if (toOrganize > 0) {
    tone = SKY
    text = `${toOrganize} ${toOrganize === 1 ? 'guide still uses' : 'guides still use'} the shared pool of images. Organize gives each guide a folder of its own, so it can be shared on its own.`
    action = (
      <button type="button" onClick={() => goTo('sync')} className={GHOST_BTN}>
        Organize folders…
      </button>
    )
  } else {
    return null
  }

  return (
    <div className="mx-auto max-w-[1600px] px-8 pt-5">
      <div
        role="status"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-2 text-sm ${tone}`}
      >
        <span>{text}</span>
        {action}
      </div>
    </div>
  )
}

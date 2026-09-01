import { PlusIcon } from './icons'
import { PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN } from '../../../shared/ui/styles'

type GuidesHeaderProps = {
  onNewGuide: () => void
}

/** Page title + the New Guide action. */
export function GuidesHeader({ onNewGuide }: GuidesHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className={PAGE_TITLE}>Guides</h2>
        <p className={PAGE_SUBTITLE}>Step-by-step reference guides</p>
      </div>
      <button type="button" onClick={onNewGuide} className={PRIMARY_BTN}>
        <PlusIcon className="h-4 w-4" />
        New Guide
      </button>
    </header>
  )
}

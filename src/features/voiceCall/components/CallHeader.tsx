import {
  PAGE_SUBTITLE,
  PAGE_TITLE,
  PRIMARY_BTN,
  SUCCESS_BTN,
} from '../../../shared/ui/styles'
import { CopyIcon } from './icons'

type CallHeaderProps = {
  justCopied: boolean
  onCopy: () => void
}

/** Page title plus the Copy notes action. */
export function CallHeader({ justCopied, onCopy }: CallHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className={PAGE_TITLE}>Voice Call</h2>
        <p className={PAGE_SUBTITLE}>
          Fill in during the call. Tab to jump between fields.
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={justCopied ? SUCCESS_BTN : PRIMARY_BTN}
      >
        <CopyIcon className="h-4 w-4" />
        {justCopied ? 'Copied' : 'Copy notes'}
      </button>
    </header>
  )
}

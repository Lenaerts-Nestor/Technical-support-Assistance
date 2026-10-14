import {
  GHOST_BTN_MD,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  PRIMARY_BTN,
  SUCCESS_BTN,
} from '../../../shared/ui/styles'
import { CopyIcon, HelpIcon, TrashIcon } from './icons'

type CallHeaderProps = {
  justCopied: boolean
  hasContent: boolean
  questionsOpen: boolean
  onToggleQuestions: () => void
  onCopy: () => void
  onClear: () => void
}

/** Page title plus the Copy notes, New call and Questions actions. */
export function CallHeader({
  justCopied,
  hasContent,
  questionsOpen,
  onToggleQuestions,
  onCopy,
  onClear,
}: CallHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className={PAGE_TITLE}>Voice Call</h2>
        <p className={PAGE_SUBTITLE}>
          Fill in during the call. Tab to jump between fields.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasContent}
          className={GHOST_BTN_MD}
        >
          <TrashIcon className="h-3.5 w-3.5" />
          New call
        </button>
        <button
          type="button"
          onClick={onToggleQuestions}
          aria-pressed={questionsOpen}
          className={`${GHOST_BTN_MD} ${questionsOpen ? 'border-brand-line bg-brand-soft text-brand-strong' : ''}`}
        >
          <HelpIcon className="h-3.5 w-3.5" />
          Questions
        </button>
        <button
          type="button"
          onClick={onCopy}
          className={justCopied ? SUCCESS_BTN : PRIMARY_BTN}
        >
          <CopyIcon className="h-4 w-4" />
          {justCopied ? 'Copied' : 'Copy notes'}
        </button>
      </div>
    </header>
  )
}

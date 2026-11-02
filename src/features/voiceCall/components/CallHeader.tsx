import { PageHeader } from '../../../app/PageHeader'
import { GHOST_BTN_MD, PRIMARY_BTN, SUCCESS_BTN } from '../../../shared/ui/styles'
import { CopyIcon, HelpIcon, TrashIcon } from './icons'

type CallHeaderProps = {
  justCopied: boolean
  hasContent: boolean
  questionsOpen: boolean
  onToggleQuestions: () => void
  onCopy: () => void
  onClear: () => void
}

/** Page title plus the New call, Questions and Copy notes actions, in that order. */
export function CallHeader({
  justCopied,
  hasContent,
  questionsOpen,
  onToggleQuestions,
  onCopy,
  onClear,
}: CallHeaderProps) {
  return (
    <PageHeader
      title="Voice Call"
      label="Live call workspace"
      description="Capture the call in three passes: device, client, resolution. Tab jumps between fields."
      actions={
        <>
          <button type="button" onClick={onClear} disabled={!hasContent} className={GHOST_BTN_MD}>
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
          <button type="button" onClick={onCopy} className={justCopied ? SUCCESS_BTN : PRIMARY_BTN}>
            <CopyIcon className="h-4 w-4" />
            {justCopied ? 'Copied' : 'Copy notes'}
          </button>
        </>
      }
    />
  )
}

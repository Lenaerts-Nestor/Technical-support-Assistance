import { AlertIcon } from './icons'

type BlockedNoticeProps = {
  /** Why nothing can be sent right now. */
  reason: string
  /** Jumps to whatever is missing. Left out when the reason is not something the user can fix on this page. */
  onFix?: () => void
}

/**
 * Says, right where the Send button is, why it is greyed out — instead of a faint
 * line further down — and offers a button that moves the cursor to the missing field.
 */
export function BlockedNotice({ reason, onFix }: BlockedNoticeProps) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-2 text-sm text-amber-50">
      <AlertIcon className="h-4 w-4 shrink-0 text-amber-300" />
      <span className="min-w-0 flex-1">{reason}</span>
      {onFix && (
        <button
          type="button"
          onClick={onFix}
          className="shrink-0 rounded-md border border-amber-300/50 px-2 py-0.5 text-xs font-bold text-amber-100 hover:bg-amber-300/20"
        >
          Take me there
        </button>
      )}
    </div>
  )
}

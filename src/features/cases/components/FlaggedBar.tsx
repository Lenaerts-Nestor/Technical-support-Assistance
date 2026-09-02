import type { FlaggedMatch } from '../types'
import { WarnIcon } from './icons'

type FlaggedBarProps = {
  matches: FlaggedMatch[]
  onJump: () => void
  onRemove: () => void
}

/** The distinct phrases behind the matches, lower-cased so "Copilot said" and
 *  "copilot said" are listed once. */
function phraseList(matches: FlaggedMatch[]): string {
  const seen = new Set(matches.map((m) => m.text.replace(/\s+/g, ' ').toLowerCase()))
  return [...seen].map((p) => `“${p}”`).join(', ')
}

/**
 * Warning strip under the editor toolbar: appears only when the draft still
 * contains a phrase from `FLAGGED_PHRASES`. Jump selects the occurrences one by
 * one; Remove strips them all.
 */
export function FlaggedBar({ matches, onJump, onRemove }: FlaggedBarProps) {
  if (!matches.length) return null

  const action =
    'rounded-md border border-rose-400/50 px-2 py-0.5 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-400/15'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rose-400/30 bg-rose-500/12 px-4 py-2">
      <p className="flex min-w-0 items-center gap-2 text-xs text-rose-200">
        <WarnIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          <span className="font-semibold">
            {matches.length} flagged {matches.length === 1 ? 'phrase' : 'phrases'}
          </span>{' '}
          — remove before sending: {phraseList(matches)}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onJump} className={action}>
          {matches.length === 1 ? 'Jump' : 'Jump to next'}
        </button>
        <button type="button" onClick={onRemove} className={action}>
          Remove all
        </button>
      </div>
    </div>
  )
}

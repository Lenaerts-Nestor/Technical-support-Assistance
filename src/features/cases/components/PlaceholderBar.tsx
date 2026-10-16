import type { FlaggedMatch } from '../types'
import { WarnIcon } from './icons'

type PlaceholderBarProps = {
  matches: FlaggedMatch[]
  onJump: () => void
}

/** The distinct placeholders, in the order they first appear. */
function placeholderList(matches: FlaggedMatch[]): string {
  const seen = new Set(matches.map((m) => m.text))
  return [...seen].join(', ')
}

/**
 * Notice under the toolbar while the draft still holds a `[placeholder]` from a
 * template. Yellow, so it reads apart from the rose flagged-phrase bar. Unlike
 * that bar there is no "Remove all": each placeholder needs a real value, so the
 * user fills or deletes them by hand. Copy stays disabled until none are left.
 */
export function PlaceholderBar({ matches, onJump }: PlaceholderBarProps) {
  if (!matches.length) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-yellow-300/40 bg-yellow-300/12 px-4 py-2">
      <p className="flex min-w-0 items-start gap-2 text-xs text-yellow-100">
        <WarnIcon className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold">
            {matches.length} {matches.length === 1 ? 'placeholder' : 'placeholders'} to fill in
          </span>{' '}
          — replace or delete each one by hand, Copy is disabled until then: {placeholderList(matches)}
        </span>
      </p>
      <button
        type="button"
        onClick={onJump}
        className="shrink-0 rounded-md border border-yellow-300/50 px-2 py-0.5 text-[11px] font-semibold text-yellow-100 transition-colors hover:bg-yellow-300/15"
      >
        {matches.length === 1 ? 'Jump' : 'Jump to next'}
      </button>
    </div>
  )
}

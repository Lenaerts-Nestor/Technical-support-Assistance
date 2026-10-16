import { useState } from 'react'
import { storageKey, usePersistentState } from '../shared/storage/usePersistentState'
import { useToday } from '../features/calendar/useToday'
import { ICON_BASE } from '../shared/ui/iconBase'
import { ICON_BTN } from '../shared/ui/styles'
import { MASCOTS, pickMascot, stepMascot } from './mascots'

/**
 * An optional GIF in the empty stretch of the sidebar between the working
 * pages and Sync. It starts closed — nothing is loaded — and a button opens it.
 * Open, it shows a different one each day; the arrows let the user pick another,
 * and that choice sticks until they go back to the daily pick.
 *
 * The embeds are cross-origin iframes, so their background can't be made
 * transparent from here. The tile is clipped to rounded corners instead, so it
 * sits softly against the sidebar.
 */
export function SidebarMascots() {
  const today = useToday()
  // Deliberately not remembered: the sidebar starts quiet on every visit.
  const [open, setOpen] = useState(false)
  // The `src` of the mascot the user chose, or null to follow the daily pick.
  const [choice, setChoice] = usePersistentState<string | null>(
    storageKey('app', 'sidebarMascot'),
    () => null,
    (raw) => (typeof raw === 'string' ? raw : null),
  )
  const mascot = pickMascot(MASCOTS, choice, today)
  const isDaily = choice === null

  return (
    <div
      aria-label="Decoration"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {open && (
        <figure className="my-auto flex flex-col gap-2">
          <div className="bg-subtle aspect-square w-full overflow-hidden rounded-2xl">
            <iframe
              key={mascot.src}
              src={mascot.src}
              title={mascot.title}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              tabIndex={-1}
              className="pointer-events-none h-full w-full border-0"
            />
          </div>
          <figcaption className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setChoice(stepMascot(MASCOTS, mascot, -1).src)}
              aria-label="Previous picture"
              title="Previous picture"
              className={ICON_BTN}
            >
              <svg {...ICON_BASE} className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              disabled={isDaily}
              title="Go back to today's random pick"
              className="text-ink-faint hover:text-ink min-w-0 flex-1 truncate text-center text-xs transition-colors enabled:cursor-pointer disabled:cursor-default"
            >
              {isDaily ? "Today's pick" : 'Back to daily pick'}
            </button>
            <button
              type="button"
              onClick={() => setChoice(stepMascot(MASCOTS, mascot, 1).src)}
              aria-label="Next picture"
              title="Next picture"
              className={ICON_BTN}
            >
              <svg {...ICON_BASE} className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </figcaption>
        </figure>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`text-ink-faint hover:bg-subtle hover:text-ink flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          open ? 'mt-2' : 'mt-auto'
        }`}
      >
        <svg {...ICON_BASE} className="h-4 w-4" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m21 16-5-5-8 8" />
        </svg>
        {open ? 'Hide GIF' : 'Show a GIF'}
      </button>
    </div>
  )
}

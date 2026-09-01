import { countSections, formatCardDate } from '../guidesData'
import { ArrowDownIcon, ArrowUpIcon, LayersIcon, LinkIcon, PinIcon } from './icons'
import { CARD, ICON_BTN } from '../../../shared/ui/styles'
import type { Guide } from '../types'

type GuideCardProps = {
  guide: Guide
  canMoveUp: boolean
  canMoveDown: boolean
  onOpen: () => void
  onTogglePin: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

/** One guide summary card in the list. Clicking the body opens the guide. */
export function GuideCard({
  guide,
  canMoveUp,
  canMoveDown,
  onOpen,
  onTogglePin,
  onMoveUp,
  onMoveDown,
}: GuideCardProps) {
  const pinned = !!guide.pinned
  const sections = countSections(guide)
  const links = guide.links.length

  return (
    <article
      className={`${CARD} relative flex flex-col p-4 transition-colors ${
        pinned ? 'border-l-[3px] border-l-brand' : 'hover:border-brand-line'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-pointer text-left"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-ink text-[15px] font-semibold">
            {guide.title || 'Untitled Guide'}
          </span>
          {pinned && (
            <span className="border-brand-line bg-brand-soft text-brand-strong shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase">
              Pinned
            </span>
          )}
        </span>

        <span className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <LayersIcon className="text-ink-faint h-3.5 w-3.5" />
            {sections} {sections === 1 ? 'section' : 'sections'}
          </span>
          <span className="inline-flex items-center gap-1">
            <LinkIcon className="text-ink-faint h-3.5 w-3.5" />
            {links} {links === 1 ? 'link' : 'links'}
          </span>
          <span>{formatCardDate(guide.updatedAt)}</span>
        </span>
      </button>

      <div className="border-line-soft mt-3 flex items-center gap-2 border-t pt-3">
        <button
          type="button"
          onClick={onTogglePin}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            pinned
              ? 'border-brand-line bg-brand-soft text-brand-strong hover:border-brand'
              : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-subtle hover:text-ink'
          }`}
        >
          <PinIcon className="h-3.5 w-3.5" />
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Move up"
          className={ICON_BTN}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Move down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
